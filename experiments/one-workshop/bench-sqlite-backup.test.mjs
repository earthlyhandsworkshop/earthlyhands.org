import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { SqliteBenchSurfaceStore } from './bench-surface-sqlite.mjs';
import { setup, populate, item, ids, alice, bob, guest } from './bench-sqlite-fixtures.mjs';
import { exportBenchSnapshot, importBenchSnapshot, BENCH_SNAPSHOT_SCHEMA } from './bench-sqlite-backup.mjs';

function scratch(t) {
  const path=mkdtempSync(join(tmpdir(),'bench-portable-'));
  t.after(()=>rmSync(path,{recursive:true,force:true}));
  return path;
}
function refingerprint(path,benchCount,eventCount) {
  const bytes=readFileSync(path);
  return {schema:BENCH_SNAPSHOT_SCHEMA,format:'sqlite3',bytes:bytes.length,
    sha256:createHash('sha256').update(bytes).digest('hex'),benchCount,eventCount};
}
test('online backup includes committed WAL events, warnings, and a batch restored by another hand',async t=>{
  const {db}=setup(t),dir=scratch(t),snapshot=join(dir,'snapshot.db'),dest=join(dir,'received.db');
  let generation=populate(db);
  db.db.exec('PRAGMA wal_autocheckpoint=0');
  generation=db.clear('old-growth','batch-14',ids,alice,generation,'clear-14');
  generation=db.restore('old-growth','batch-14',bob,generation,'restore-14');
  const manifest=await exportBenchSnapshot(db,snapshot);
  assert.equal(manifest.eventCount,16);
  assert.equal(manifest.benchCount,1);
  db.place('old-growth',item(15),bob,generation,'place-15');
  await importBenchSnapshot(snapshot,dest,manifest);
  const received=new SqliteBenchSurfaceStore(dest);
  try {
    const a=received.readActive('old-growth',alice);
    assert.equal(a.generation,16);
    assert.equal(a.activeItems.length,14);
    assert.deepEqual(a.activeItems.find(x=>x.itemId==='leaf-7').warningIds,['unresolved-warning-7']);
    assert.equal(received.readBatch('old-growth','batch-14',alice).clearedBy,'alice');
    assert.equal(received.readBatch('old-growth','batch-14',bob).restoredBy,'bob');
    assert.deepEqual(received.readTrace('old-growth',bob,{after:14}).map(x=>x.kind),['clear','restore']);
    assert.equal(a.activeItems.some(x=>x.itemId==='leaf-15'),false);
  }finally{received.close();}
});
test('an un-restored clear crosses the snapshot, and the batch can then be restored',async t=>{
  const {db}=setup(t),dir=scratch(t),source=join(dir,'source.db'),dest=join(dir,'dest.db');
  let generation=db.place('old-growth',item(7),alice,0,'place-7');
  generation=db.clear('old-growth','batch-7',['leaf-7'],alice,generation,'clear-7');
  const receipt=await exportBenchSnapshot(db,source);
  await importBenchSnapshot(source,dest,JSON.stringify(receipt));
  const returned=new SqliteBenchSurfaceStore(dest);
  try{
    assert.equal(returned.readBatch('old-growth','batch-7',bob).restored,false);
    generation=returned.restore('old-growth','batch-7',bob,generation,'restore-7');
    assert.equal(generation,3);
    assert.deepEqual(returned.readActive('old-growth',alice).activeItems[0].warningIds,['unresolved-warning-7']);
  }finally{returned.close();}
});
test('Bello owner/match compartments remain filtered after return',async t=>{
  const compartment={kind:'bello-player',ownerId:'player-a',matchId:'match-1'};
  const owner={authenticated:true,workshopMember:true,principalId:'player-a',matchId:'match-1'};
  const rival={authenticated:true,workshopMember:true,principalId:'player-b',matchId:'match-1'};
  const {db}=setup(t,compartment),dir=scratch(t),source=join(dir,'source.db'),dest=join(dir,'dest.db');
  db.place('old-growth',item(7,compartment),owner,0,'place-7');
  await importBenchSnapshot(source,dest,await exportBenchSnapshot(db,source));
  const returned=new SqliteBenchSurfaceStore(dest);
  try{
    assert.equal(returned.readActive('old-growth',rival),null);
    assert.equal(returned.readTrace('old-growth',guest),null);
    assert.deepEqual(returned.readActive('old-growth',owner).activeItems[0].warningIds,['unresolved-warning-7']);
  }finally{returned.close();}
});
test('bad bytes and false manifest counts do not create a destination',async t=>{
  const {db}=setup(t),dir=scratch(t),source=join(dir,'source.db'),dest=join(dir,'dest.db');
  db.place('old-growth',item(1),alice,0,'place-1');
  const receipt=await exportBenchSnapshot(db,source);
  await assert.rejects(importBenchSnapshot(source,dest,{...receipt,eventCount:0}),/count\/manifest mismatch/);
  assert.equal(existsSync(dest),false);
  const corrupted=readFileSync(source);
  corrupted[corrupted.length-1]^=1;
  writeFileSync(source,corrupted);
  await assert.rejects(importBenchSnapshot(source,dest,receipt),/bytes\/hash mismatch/);
  assert.equal(existsSync(dest),false);
});
test('a recomputed hash cannot authorize broadened access or broken event history',async t=>{
  const {db}=setup(t),dir=scratch(t),source=join(dir,'source.db'),bad=join(dir,'bad.db'),dest=join(dir,'dest.db');
  db.place('old-growth',item(7),alice,0,'place-7');
  await exportBenchSnapshot(db,source);
  writeFileSync(bad,readFileSync(source));
  let handle=new DatabaseSync(bad);
  handle.prepare('UPDATE items SET access_json=?').run(JSON.stringify({kind:'public'}));
  handle.close();
  await assert.rejects(importBenchSnapshot(bad,dest,refingerprint(bad,1,1)),/access does not match bench/);
  assert.equal(existsSync(dest),false);
  writeFileSync(bad,readFileSync(source));
  handle=new DatabaseSync(bad);
  handle.exec('UPDATE benches SET generation=0');
  handle.close();
  await assert.rejects(importBenchSnapshot(bad,dest,refingerprint(bad,1,1)),/generation\/event history mismatch/);
  assert.equal(existsSync(dest),false);
});
test('an unrelated SQLite schema is refused even with matching fingerprint',async t=>{
  const dir=scratch(t),source=join(dir,'other.db'),dest=join(dir,'dest.db');
  const handle=new DatabaseSync(source);
  handle.exec('CREATE TABLE other (id INTEGER)');
  handle.close();
  await assert.rejects(importBenchSnapshot(source,dest,refingerprint(source,0,0)),/no such table/);
  assert.equal(existsSync(dest),false);
});
test('a previous destination and its sidecars cannot be replaced',async t=>{
  const {db}=setup(t),dir=scratch(t),source=join(dir,'source.db'),dest=join(dir,'dest.db');
  const receipt=await exportBenchSnapshot(db,source);
  await assert.rejects(exportBenchSnapshot(db,source),/EEXIST/);
  writeFileSync(dest,'old');
  await assert.rejects(importBenchSnapshot(source,dest,receipt),/EEXIST/);
  assert.equal(readFileSync(dest,'utf8'),'old');
  rmSync(dest);
  writeFileSync(dest+'-wal','old-sidecar');
  await assert.rejects(importBenchSnapshot(source,dest,receipt),/stale SQLite sidecar/);
  assert.equal(existsSync(dest),false);
});
test('no export is allowed from an open transaction',async t=>{
  const {db}=setup(t),dir=scratch(t),dest=join(dir,'dest.db');
  db.db.exec('BEGIN IMMEDIATE');
  try{await assert.rejects(exportBenchSnapshot(db,dest),/idle local Workbench/);}
  finally{db.db.exec('ROLLBACK');}
  assert.equal(existsSync(dest),false);
});
test('2,500 clear/restore cycles and oldest/newest receipts survive export/import',async t=>{
  const {db}=setup(t),dir=scratch(t),source=join(dir,'5001.db'),dest=join(dir,'returned.db');
  let gen=db.place('old-growth',item(1),alice,0,'place-1');
  for(let i=1;i<=2500;i++){
    gen=db.clear('old-growth','batch-'+i,['leaf-1'],alice,gen,'clear-'+i);
    gen=db.restore('old-growth','batch-'+i,bob,gen,'restore-'+i);
  }
  const receipt=await exportBenchSnapshot(db,source);
  assert.equal(receipt.eventCount,5001);
  await importBenchSnapshot(source,dest,receipt);
  const returned=new SqliteBenchSurfaceStore(dest);
  try{
    assert.equal(returned.readActive('old-growth',alice).generation,5001);
    assert.equal(returned.readBatch('old-growth','batch-1',alice).restored,true);
    assert.equal(returned.readBatch('old-growth','batch-2500',bob).restored,true);
    assert.equal(returned.readTrace('old-growth',alice,{after:4999}).length,2);
  }finally{returned.close();}
});

test('matching fingerprints do not authorize unexpected SQLite schema objects', async t => {
  const {db}=setup(t),dir=scratch(t),snapshot=join(dir,'source.db');
  db.place('old-growth',item(7),alice,0,'place-7');
  const manifest=await exportBenchSnapshot(db,snapshot);
  assert.equal(manifest.eventCount,1);
  const knownGood=readFileSync(snapshot);
  const attacks=[
    ['future-write trigger',
      `CREATE TRIGGER invisible_change AFTER UPDATE ON benches
       BEGIN UPDATE items SET active=0; END`],
    ['extra private table', 'CREATE TABLE shadow_receipts (note TEXT)'],
    ['invented view', 'CREATE VIEW shared_public AS SELECT * FROM items'],
    ['altered column layout', 'ALTER TABLE items ADD COLUMN forged_permission TEXT']
  ];
  for (const [name,sql] of attacks) {
    await t.test(name,async()=>{
      const slug=name.replaceAll(' ','-');
      const tampered=join(dir,slug+'.db'), dest=join(dir,slug+'-returned.db');
      writeFileSync(tampered,knownGood);
      const handle=new DatabaseSync(tampered);
      try { handle.exec(sql); } finally { handle.close(); }
      // SQLite still opens cleanly. Recalculate a *matching* manifest, so
      // rejection is due to the schema gate, not damaged transport bytes.
      const refreshed=refingerprint(tampered,1,1);
      await assert.rejects(importBenchSnapshot(tampered,dest,refreshed),
        /schema differs from known Workbench v0 schema/);
      assert.equal(existsSync(dest),false);
    });
  }
  // The original valid source and its manifest are not altered by the probes.
  assert.deepEqual(readFileSync(snapshot),knownGood);
});
