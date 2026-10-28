// Fictional process-boundary return: separate Node processes, one local runner.
// Not two computers, real credentials, source-object transfer, or power-loss testing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, copyFileSync, writeFileSync,
  readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { ChronologyV1BenchStore, auditChronologyV1 } from './bench-chronology-v1.mjs';
import { exportChronologyV1Snapshot, importChronologyV1Snapshot }
  from './bench-chronology-v1-backup.mjs';
import { alice, bob, item, workshop } from './bench-sqlite-fixtures.mjs';

const SELF=fileURLToPath(import.meta.url);
if (process.argv[2] === '--receive') {
  // The receiving process gets only the snapshot, manifest, and fresh target
  // path. It does not inherit the live source DB handle or caller's objects.
  const [snapshot,target,manifestPath] = process.argv.slice(3);
  try {
    const manifest=JSON.parse(readFileSync(manifestPath,'utf8'));
    await importChronologyV1Snapshot(snapshot,target,manifest);
    const returned=new ChronologyV1BenchStore(target);
    try {
      assert.equal(auditChronologyV1(returned.db),true);
      const active=returned.readActive('old-growth',alice);
      assert.equal(active.generation,5);
      assert.deepEqual(active.activeItems.map(x=>x.itemId),
        ['leaf-1','leaf-2','leaf-7']);
      assert.equal(returned.readBatch('old-growth','batch-2',bob).restored,true);
      assert.deepEqual(active.activeItems.find(x=>x.itemId==='leaf-7').warningIds,
        ['unresolved-warning-7']);
    } finally {returned.close();}
    process.stdout.write(JSON.stringify({received:true,events:5})+'\n');
  } catch (error) {
    process.stderr.write('Receiver refused: '+error.message+'\n');
    process.exitCode=1;
  }
} else {
  function setup(t) {
    const dir=mkdtempSync(join(tmpdir(),'bench-v1-process-crossing-'));
    t.after(()=>rmSync(dir,{recursive:true,force:true}));
    const sourceDir=join(dir,'source'),receiverDir=join(dir,'receiver');
    mkdirSync(sourceDir);mkdirSync(receiverDir);
    const db=new ChronologyV1BenchStore(join(sourceDir,'live.sqlite'));
    t.after(()=>db.close());
    db.createBench('old-growth',workshop);
    let gen=db.place('old-growth',item(1),alice,0,'place-1');
    gen=db.place('old-growth',item(2),alice,gen,'place-2');
    gen=db.clear('old-growth','batch-2',['leaf-1','leaf-2'],alice,gen,'clear-2');
    gen=db.restore('old-growth','batch-2',bob,gen,'restore-2');
    db.place('old-growth',item(7),alice,gen,'place-7');
    return {db,sourceDir,receiverDir};
  }
  function runReceiver(source,target,manifestFile) {
    return spawnSync(process.execPath,[SELF,'--receive',source,target,manifestFile],
      {encoding:'utf8',timeout:20000,windowsHide:true});
  }
  test('fresh Node process independently receives a v1 snapshot from another directory',async t=>{
    const {db,sourceDir,receiverDir}=setup(t);
    const snapshot=join(sourceDir,'snapshot.sqlite');
    const manifest=await exportChronologyV1Snapshot(db,snapshot);
    const incoming=join(receiverDir,'incoming.sqlite');
    const manifestFile=join(receiverDir,'manifest.json');
    const target=join(receiverDir,'restored.sqlite');
    copyFileSync(snapshot,incoming);
    writeFileSync(manifestFile,JSON.stringify(manifest),{mode:0o600});
    const child=runReceiver(incoming,target,manifestFile);
    assert.ifError(child.error);
    assert.equal(child.status,0,child.stderr);
    assert.deepEqual(JSON.parse(child.stdout.trim()),{received:true,events:5});
    assert.equal(existsSync(target),true);
    assert.deepEqual(readFileSync(incoming),readFileSync(snapshot));
    // Reopening in the original process is independent readback, not the
    // receiver's own assertion alone.
    const reopened=new ChronologyV1BenchStore(target);
    try {
      assert.equal(auditChronologyV1(reopened.db),true);
      assert.equal(reopened.readActive('old-growth',alice).generation,5);
    } finally {reopened.close();}
  });
  test('separate receiver process refuses forged future clearing with matching SHA-256',async t=>{
    const {db,sourceDir,receiverDir}=setup(t);
    const snapshot=join(sourceDir,'snapshot.sqlite');
    const manifest=await exportChronologyV1Snapshot(db,snapshot);
    const forged=join(receiverDir,'forged.sqlite');
    copyFileSync(snapshot,forged);
    const handle=new DatabaseSync(forged);
    try {
      handle.prepare("UPDATE batch_items SET item_id='leaf-7' WHERE batch_id='batch-2' AND item_id='leaf-2'").run();
      assert.deepEqual(handle.prepare('PRAGMA foreign_key_check').all(),[]);
    } finally {handle.close();}
    const bytes=readFileSync(forged);
    const revised={...manifest,bytes:bytes.length,
      sha256:createHash('sha256').update(bytes).digest('hex')};
    const manifestFile=join(receiverDir,'forged-manifest.json');
    const target=join(receiverDir,'must-not-exist.sqlite');
    writeFileSync(manifestFile,JSON.stringify(revised),{mode:0o600});
    const child=runReceiver(forged,target,manifestFile);
    assert.ifError(child.error);
    assert.equal(child.status,1);
    assert.match(child.stderr,/Chronology v1 mismatch/);
    assert.equal(existsSync(target),false);
    assert.equal(existsSync(snapshot),true);
  });
}
