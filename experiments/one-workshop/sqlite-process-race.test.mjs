// Proves storage-level conflict detection across independent Node processes.
// Fictional data only. Requires Node 22+ with node:sqlite.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SqliteDocumentStore, VersionConflict } from './sqlite-store.mjs';

const SELF = fileURLToPath(import.meta.url);
if (process.argv[2] === '--writer') {
  const [filename, content] = process.argv.slice(3);
  const store = new SqliteDocumentStore(filename);
  process.send({ type: 'ready' });
  process.on('message', signal => {
    if (signal !== 'go') return;
    try {
      const saved = store.save(content, 1);
      process.send({ type: 'outcome', value: 'saved', generation: saved.generation });
    } catch (e) {
      process.send({ type: 'outcome', value: e instanceof VersionConflict ? 'conflict' : 'unexpected', error: e.message });
    } finally {
      store.close();
      process.disconnect();
    }
  });
} else {
  test('independent processes cannot silently overwrite the same revision', async t => {
    const dir = mkdtempSync(join(tmpdir(), 'one-workshop-process-race-'));
    t.after(() => rmSync(dir, {recursive:true, force:true}));
    const filename = join(dir, 'test.sqlite');
    const seed = new SqliteDocumentStore(filename);
    seed.close();
    function writer(content) {
      const child = fork(SELF, ['--writer', filename, content], { execArgv: [], stdio: ['ignore','ignore','pipe','ipc'] });
      t.after(() => { if (!child.killed) child.kill(); });
      const ready = new Promise((resolve, reject) => {
        child.on('message', m => { if (m?.type === 'ready') resolve(); });
        child.on('error', reject);
        child.on('exit', code => { if (code !== 0) reject(new Error('writer failed: '+code)); });
      });
      const outcome = new Promise((resolve, reject) => {
        child.on('message', m => { if (m?.type === 'outcome') resolve(m); });
        child.on('error', reject);
        child.on('exit', code => { if (code !== 0) reject(new Error('writer failed: '+code)); });
      });
      return {ready, outcome, start:()=>child.send('go')};
    }
    const a=writer('Alice private edit'), b=writer('Bob private edit');
    await Promise.all([a.ready,b.ready]);
    a.start(); b.start();
    const outcomes=await Promise.all([a.outcome,b.outcome]);
    assert.deepEqual(outcomes.map(o=>o.value).sort(), ['conflict','saved']);
    const reopened=new SqliteDocumentStore(filename);
    try {
      const state=reopened.readWorking();
      assert.equal(state.generation,2);
      assert.equal(state.document.history.length,2);
      assert.ok(['Alice private edit','Bob private edit'].includes(state.document.history.at(-1).content));
      assert.equal(reopened.readPublic(),null);
    } finally { reopened.close(); }
  });
}
