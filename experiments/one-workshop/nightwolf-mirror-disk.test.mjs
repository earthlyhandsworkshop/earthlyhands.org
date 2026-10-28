// Nightwolf fictional local-file return; no actual Nightwolf hardware or
// authenticated companion has been used by these tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, copyFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { MIRROR_SCHEMA, sealMirror } from './nightwolf-mirror.mjs';
import { NightwolfMirrorDisk } from './nightwolf-mirror-disk.mjs';

const bytes = Buffer.from('fictional artifact').toString('base64');
const sha256 = createHash('sha256').update('fictional artifact').digest('hex');
const original = () => ({ schema: MIRROR_SCHEMA, generation: 1,
  actors: [{id:'ten',kind:'human',name:'Ten'},
    {id:'codex',kind:'companion',name:'Codex'}],
  objects: [{id:'leaf', bytes, sha256}],
  events: [{seq:1,eventId:'e:1',actorId:'ten',objectId:'leaf',
    scope:'private:ten',body:'private fictional note'}] });
const withSecond = () => {
  const c=original(); c.generation=2;
  c.events.push({seq:2,eventId:'e:2',actorId:'codex',objectId:'leaf',
    scope:'workshop',body:'shared fictional note'});
  return c;
};
const withThird = () => {
  const c=withSecond(); c.generation=3;
  c.events.push({seq:3,eventId:'e:3',actorId:'codex',objectId:'leaf',
    scope:'private:codex',body:'another private fictional note'});
  return c;
};
function atTemporaryFile(t) {
  const dir=mkdtempSync(join(tmpdir(),'nightwolf-disk-fixture-'));
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  return {dir, path:join(dir,'mirror.sqlite')};
}
const SELF=fileURLToPath(import.meta.url);
if (process.argv[2] === '--cold-receiver') {
  const path=process.argv[3];
  try {
    const db=new NightwolfMirrorDisk(path);
    try {
      assert.equal(db.summary().generation,1);
      assert.equal(db.readForClaimedActor('codex').length,0);
      db.receive(sealMirror(withSecond()));
      assert.deepEqual(db.readForClaimedActor('codex').map(x=>x.eventId),['e:2']);
    } finally { db.close(); }
    process.stdout.write('cold receiver accepted generation 2\n');
  } catch (error) { process.stderr.write(error.stack+'\n'); process.exitCode=1; }
} else {
  test('closed disk reopens with generation, private boundary, and binary receipt intact', t=>{
    const {path}=atTemporaryFile(t);
    let db=new NightwolfMirrorDisk(path);
    const accepted=db.receive(sealMirror(original()));
    assert.equal(accepted.generation,1);
    db.close();
    db=new NightwolfMirrorDisk(path);
    try {
      assert.equal(db.summary().digest,accepted.digest);
      assert.deepEqual(db.readForClaimedActor('ten').map(x=>x.body),
        ['private fictional note']);
      assert.deepEqual(db.readForClaimedActor('codex'),[]);
      assert.throws(()=>db.readForClaimedActor('invented'),/Unknown mirror actor/);
      db.receive(sealMirror(withSecond()));
      assert.deepEqual(db.readForClaimedActor('codex').map(x=>x.body),
        ['shared fictional note']);
    } finally {db.close();}
  });
  test('two independent SQLite connections reject duplicate generation and old history rewrite',t=>{
    const {path}=atTemporaryFile(t);
    const first=new NightwolfMirrorDisk(path), second=new NightwolfMirrorDisk(path);
    t.after(()=>{first.close();second.close();});
    first.receive(sealMirror(original()));
    assert.equal(second.summary().generation,1);
    first.receive(sealMirror(withSecond()));
    assert.throws(()=>second.receive(sealMirror(withSecond())),/rollback/);
    const rewritten=withThird(); rewritten.events[0].body='rewritten past';
    assert.throws(()=>second.receive(sealMirror(rewritten)),/history rewrite/);
    assert.equal(second.summary().generation,2);
    assert.deepEqual(second.readForClaimedActor('ten').map(x=>x.eventId),['e:1','e:2']);
  });
  test('invalid envelope and failed binary digest leave prior complete generation',t=>{
    const {path}=atTemporaryFile(t);
    const db=new NightwolfMirrorDisk(path);t.after(()=>db.close());
    const old=db.receive(sealMirror(original()));
    const wrong=sealMirror(withSecond()); wrong.core.events[1].body='tampered';
    assert.throws(()=>db.receive(wrong),/digest mismatch/);
    const wrongObject=withSecond(); wrongObject.objects[0].sha256='0'.repeat(64);
    assert.throws(()=>db.receive(sealMirror(wrongObject)),/binary integrity mismatch/);
    assert.deepEqual(db.summary(),old);
    assert.deepEqual(db.readForClaimedActor('codex'),[]);
    assert.equal(db.receive(sealMirror(withSecond())).generation,2);
  });
  test('disk row corruption is detected on reopen rather than treated as history',t=>{
    const {path}=atTemporaryFile(t);
    let db=new NightwolfMirrorDisk(path);
    db.receive(sealMirror(original()));db.close();
    const raw=new DatabaseSync(path);
    raw.prepare('UPDATE mirror_state SET digest = ? WHERE singleton = 1').run('0'.repeat(64));
    raw.close();
    db=new NightwolfMirrorDisk(path);
    try {
      assert.throws(()=>db.summary(),/contradicts/);
      assert.throws(()=>db.receive(sealMirror(withSecond())),/contradicts/);
    } finally {db.close();}
  });
  test('offline closed-file copy reopens in a separate receiving process without source handle',t=>{
    const {dir,path}=atTemporaryFile(t);
    let db=new NightwolfMirrorDisk(path);db.receive(sealMirror(original()));db.close();
    const copied=join(dir,'offline-receiver.sqlite');
    copyFileSync(path,copied);
    const run=spawnSync(process.execPath,[SELF,'--cold-receiver',copied],
      {encoding:'utf8',timeout:20000,windowsHide:true});
    assert.ifError(run.error);assert.equal(run.status,0,run.stderr);
    assert.match(run.stdout,/cold receiver accepted generation 2/);
    assert.equal(existsSync(path),true);
    db=new NightwolfMirrorDisk(path);
    try {assert.equal(db.summary().generation,1)} finally {db.close();}
    db=new NightwolfMirrorDisk(copied);
    try {
      assert.equal(db.summary().generation,2);
      assert.deepEqual(db.readForClaimedActor('ten').map(x=>x.eventId),['e:1','e:2']);
      assert.deepEqual(db.readForClaimedActor('codex').map(x=>x.eventId),['e:2']);
    } finally {db.close();}
  });
}
