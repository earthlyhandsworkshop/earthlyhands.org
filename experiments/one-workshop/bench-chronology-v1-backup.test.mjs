// Independent fictional chronology-v1 export/import, with adversarial snapshots.
// SHA-256 here is a transfer check, not an identity or historical truth claim.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, copyFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { ChronologyV1BenchStore, auditChronologyV1 } from './bench-chronology-v1.mjs';
import { SqliteBenchSurfaceStore } from './bench-surface-sqlite.mjs';
import { alice, bob, item, workshop } from './bench-sqlite-fixtures.mjs';
import { exportChronologyV1Snapshot, importChronologyV1Snapshot,
  BENCH_CHRONOLOGY_V1_SNAPSHOT_SCHEMA } from './bench-chronology-v1-backup.mjs';
import { exportBenchSnapshot, importBenchSnapshot } from './bench-sqlite-backup.mjs';

function setup(t) {
  const dir=mkdtempSync(join(tmpdir(),'bench-v1-transfer-'));
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const db=new ChronologyV1BenchStore(join(dir,'live.db'));
  t.after(()=>db.close());
  db.createBench('old-growth',workshop);
  return {dir,db};
}
function populate(db) {
  let gen=db.place('old-growth',item(1),alice,0,'place-1');
  gen=db.place('old-growth',item(2),alice,gen,'place-2');
  gen=db.clear('old-growth','batch-2',['leaf-1','leaf-2'],alice,gen,'clear-2');
  gen=db.restore('old-growth','batch-2',bob,gen,'restore-2');
  db.place('old-growth',item(7),alice,gen,'place-7');
}
function refingerprint(path,manifest) {
  const bytes=readFileSync(path);
  return {...manifest,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
}
test('v1 committed WAL history crosses into a fresh database with exact arrivals and warnings',async t=>{
  const {dir,db}=setup(t);
  populate(db);
  db.db.exec('PRAGMA wal_autocheckpoint=0');
  const source=join(dir,'snapshot.db'),dest=join(dir,'restored.db');
  const manifest=await exportChronologyV1Snapshot(db,source);
  assert.equal(manifest.schema,BENCH_CHRONOLOGY_V1_SNAPSHOT_SCHEMA);
  assert.equal(manifest.eventCount,5);
  db.place('old-growth',item(8),alice,5,'place-8'); // post-snapshot: must not cross
  await importChronologyV1Snapshot(source,dest,manifest);
  const received=new ChronologyV1BenchStore(dest);
  try {
    assert.equal(auditChronologyV1(received.db),true);
    const active=received.readActive('old-growth',alice);
    assert.equal(active.generation,5);
    assert.deepEqual(active.activeItems.map(x=>x.itemId),['leaf-1','leaf-2','leaf-7']);
    assert.deepEqual(active.activeItems.find(x=>x.itemId==='leaf-7').warningIds,['unresolved-warning-7']);
    assert.equal(received.readBatch('old-growth','batch-2',bob).restored,true);
    assert.deepEqual(received.db.prepare('SELECT placed_item_id FROM events WHERE kind=\'place\' ORDER BY seq').all().map(x=>x.placed_item_id),
      ['leaf-1','leaf-2','leaf-7']);
  } finally { received.close(); }
});
test('a forged future item in an earlier clearing is refused even with a matching hash',async t=>{
  const {dir,db}=setup(t); populate(db);
  const source=join(dir,'source.db'),forged=join(dir,'forged.db'),dest=join(dir,'received.db');
  const manifest=await exportChronologyV1Snapshot(db,source);
  copyFileSync(source,forged);
  const handle=new DatabaseSync(forged);
  try {
    handle.prepare("UPDATE batch_items SET item_id='leaf-7' WHERE batch_id='batch-2' AND item_id='leaf-2'").run();
    assert.deepEqual(handle.prepare('PRAGMA foreign_key_check').all(),[]);
  } finally { handle.close(); }
  await assert.rejects(importChronologyV1Snapshot(forged,dest,refingerprint(forged,manifest)),
    /Chronology v1 mismatch/);
  assert.equal(existsSync(dest),false);
});
test('a forged arriving item ID is refused even with a matching hash',async t=>{
  const {dir,db}=setup(t); populate(db);
  const source=join(dir,'source.db'),forged=join(dir,'forged.db'),dest=join(dir,'received.db');
  const manifest=await exportChronologyV1Snapshot(db,source);
  copyFileSync(source,forged);
  const handle=new DatabaseSync(forged);
  try {handle.prepare("UPDATE events SET placed_item_id='leaf-7' WHERE event_id='place-2'").run();}
  finally {handle.close();}
  await assert.rejects(importChronologyV1Snapshot(forged,dest,refingerprint(forged,manifest)),
    /Chronology v1 mismatch/);
  assert.equal(existsSync(dest),false);
});
test('v1 and v0 snapshots do not cross each other\'s version gate',async t=>{
  const {dir,db}=setup(t); populate(db);
  const source=join(dir,'v1.db'),dest=join(dir,'wrong.db');
  const manifest=await exportChronologyV1Snapshot(db,source);
  await assert.rejects(importBenchSnapshot(source,dest,manifest),/Invalid Workbench snapshot manifest/);
  await assert.rejects(exportBenchSnapshot(db,join(dir,'wrong-v0.db')),
    /Snapshot schema differs from known Workbench v0 schema/);
  assert.equal(existsSync(dest),false);
  const old=new SqliteBenchSurfaceStore(join(dir,'old.db'));
  try {
    old.createBench('old-growth',workshop);
    old.place('old-growth',item(1),alice,0,'place-1');
    await assert.rejects(exportChronologyV1Snapshot(old,join(dir,'wrong-v1.db')),
      /chronology v1 Workbench store/);
  } finally {old.close();}
});
test('v1 receiver rejects changed bytes and never overwrites an existing destination',async t=>{
  const {dir,db}=setup(t); populate(db);
  const source=join(dir,'source.db'),dest=join(dir,'existing.db');
  const manifest=await exportChronologyV1Snapshot(db,source);
  writeFileSync(dest,'previous work');
  await assert.rejects(importChronologyV1Snapshot(source,dest,manifest),/EEXIST/);
  assert.equal(readFileSync(dest,'utf8'),'previous work');
  const bad=join(dir,'changed.db'),empty=join(dir,'empty.db');
  copyFileSync(source,bad);
  const bytes=readFileSync(bad);bytes[bytes.length-1]^=1;writeFileSync(bad,bytes);
  await assert.rejects(importChronologyV1Snapshot(bad,empty,manifest),/bytes\/hash mismatch/);
  assert.equal(existsSync(empty),false);
});
test('a hidden trigger is refused even when the v1 manifest is recomputed',async t=>{
  const {dir,db}=setup(t); populate(db);
  const source=join(dir,'source.db'),forged=join(dir,'forged.db'),dest=join(dir,'received.db');
  const manifest=await exportChronologyV1Snapshot(db,source);
  copyFileSync(source,forged);
  const handle=new DatabaseSync(forged);
  try {handle.exec("CREATE TRIGGER future_mutation AFTER UPDATE ON benches BEGIN UPDATE items SET active=0; END");}
  finally {handle.close();}
  await assert.rejects(importChronologyV1Snapshot(forged,dest,refingerprint(forged,manifest)),
    /schema differs from known Workbench chronology v1 schema/);
  assert.equal(existsSync(dest),false);
});

test('2,500 exact-identity clear/restore cycles remain replayable after v1 return',async t=>{
  const {dir,db}=setup(t);
  let gen=db.place('old-growth',item(7),alice,0,'place-7');
  for(let i=1;i<=2500;i++) {
    gen=db.clear('old-growth','batch-'+i,['leaf-7'],alice,gen,'clear-'+i);
    gen=db.restore('old-growth','batch-'+i,bob,gen,'restore-'+i);
  }
  const source=join(dir,'long-snapshot.db'),dest=join(dir,'long-return.db');
  const manifest=await exportChronologyV1Snapshot(db,source);
  assert.equal(manifest.eventCount,5001);
  await importChronologyV1Snapshot(source,dest,manifest);
  const restored=new ChronologyV1BenchStore(dest);
  try {
    assert.equal(auditChronologyV1(restored.db),true);
    assert.equal(restored.readActive('old-growth',alice).generation,5001);
    assert.deepEqual(restored.readActive('old-growth',alice).activeItems[0].warningIds,
      ['unresolved-warning-7']);
    assert.equal(restored.readBatch('old-growth','batch-1',alice).restored,true);
    assert.equal(restored.readBatch('old-growth','batch-2500',bob).restored,true);
    assert.deepEqual(restored.readTrace('old-growth',alice,{after:4999}).map(x=>x.kind),
      ['clear','restore']);
    assert.equal(restored.db.prepare("SELECT placed_item_id FROM events WHERE event_id='place-7'").get().placed_item_id,'leaf-7');
  } finally {restored.close();}
});

test('v1 private compartments survive return without granting a rival read access',async t=>{
  const {dir,db}=setup(t);
  const compartment={kind:'bello-player',ownerId:'player-a',matchId:'match-1'};
  const owner={authenticated:true,workshopMember:true,principalId:'player-a',matchId:'match-1'};
  const rival={authenticated:true,workshopMember:true,principalId:'player-b',matchId:'match-1'};
  db.createBench('bello-player-a',compartment);
  db.place('bello-player-a',item(7,compartment),owner,0,'private-place-7');
  const source=join(dir,'private-snapshot.db'),dest=join(dir,'private-return.db');
  const manifest=await exportChronologyV1Snapshot(db,source);
  assert.equal(manifest.benchCount,2);
  await importChronologyV1Snapshot(source,dest,manifest);
  const restored=new ChronologyV1BenchStore(dest);
  try {
    assert.equal(auditChronologyV1(restored.db),true);
    assert.equal(restored.readActive('bello-player-a',rival),null);
    assert.equal(restored.readTrace('bello-player-a',rival),null);
    assert.equal(restored.readActive('bello-player-a',owner).activeItems[0].itemId,'leaf-7');
    assert.deepEqual(restored.readActive('bello-player-a',owner).activeItems[0].warningIds,
      ['unresolved-warning-7']);
  } finally {restored.close();}
});

test('truncated transfer refuses installation and leaves no private staging file',async t=>{
  const {dir,db}=setup(t);populate(db);
  const source=join(dir,'snapshot.db'),damaged=join(dir,'truncated.db'),dest=join(dir,'not-installed.db');
  const manifest=await exportChronologyV1Snapshot(db,source);
  const bytes=readFileSync(source);
  writeFileSync(damaged,bytes.subarray(0,Math.floor(bytes.length/2)));
  const before=readdirSync(dir).filter(x=>x.startsWith('.workbench-snapshot-'));
  await assert.rejects(importChronologyV1Snapshot(damaged,dest,manifest),/bytes\/hash mismatch/);
  assert.equal(existsSync(dest),false);
  assert.deepEqual(readdirSync(dir).filter(x=>x.startsWith('.workbench-snapshot-')),before);
  assert.deepEqual(readFileSync(source),bytes);
});

test('two independent v1 handles reject a stale post-restore write',async t=>{
  const {dir,db}=setup(t);populate(db);
  const source=join(dir,'snapshot.db'),dest=join(dir,'returned.db');
  await importChronologyV1Snapshot(source,dest,await exportChronologyV1Snapshot(db,source));
  const first=new ChronologyV1BenchStore(dest),second=new ChronologyV1BenchStore(dest);
  try {
    const oldGeneration=first.readActive('old-growth',alice).generation;
    assert.equal(oldGeneration,5);
    const next=first.place('old-growth',item(8),alice,oldGeneration,'place-8');
    assert.equal(next,6);
    assert.throws(()=>second.place('old-growth',item(9),bob,oldGeneration,'place-9'),
      /Stale bench generation/);
    assert.equal(second.readActive('old-growth',bob).generation,6);
    assert.equal(auditChronologyV1(second.db),true);
  } finally {first.close();second.close();}
});
