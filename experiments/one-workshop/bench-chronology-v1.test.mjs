import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ChronologyV1BenchStore, auditChronologyV1 } from './bench-chronology-v1.mjs';
import { SqliteBenchSurfaceStore } from './bench-surface-sqlite.mjs';
import { item, alice, bob, workshop } from './bench-sqlite-fixtures.mjs';

function setup(t) {
  const dir=mkdtempSync(join(tmpdir(),'chronology-v1-'));
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const db=new ChronologyV1BenchStore(join(dir,'v1.db'));
  t.after(()=>db.close());
  db.createBench('old-growth',workshop);
  return db;
}
function history(db) {
  let gen=db.place('old-growth',item(1),alice,0,'place-1');
  gen=db.place('old-growth',item(2),alice,gen,'place-2');
  gen=db.clear('old-growth','batch-2',['leaf-1','leaf-2'],alice,gen,'clear-2');
  gen=db.restore('old-growth','batch-2',bob,gen,'restore-2');
  db.place('old-growth',item(3),alice,gen,'place-3');
}
test('v1 writes exact item identity atomically and replays a valid return',t=>{
  const db=setup(t);
  history(db);
  assert.equal(auditChronologyV1(db.db),true);
  const receipts=db.db.prepare("SELECT kind,placed_item_id FROM events WHERE bench_id='old-growth' ORDER BY seq").all();
  assert.deepEqual(receipts.map(x=>x.placed_item_id),['leaf-1','leaf-2',null,null,'leaf-3']);
  assert.deepEqual(db.readActive('old-growth',alice).activeItems.map(x=>x.itemId),['leaf-1','leaf-2','leaf-3']);
});
test('v1 refuses the exact future-item clearing that v0 cannot detect',t=>{
  const db=setup(t);
  history(db);
  db.db.prepare("UPDATE batch_items SET item_id='leaf-3' WHERE batch_id='batch-2' AND item_id='leaf-2'").run();
  assert.deepEqual(db.db.prepare('PRAGMA foreign_key_check').all(),[]);
  assert.throws(()=>auditChronologyV1(db.db),/future, or inactive items/);
});
test('v1 refuses an invented earlier arrival and a duplicated arrival',t=>{
  const db=setup(t);
  history(db);
  db.db.prepare("UPDATE events SET placed_item_id='leaf-3' WHERE event_id='place-2'").run();
  // The false receipt is caught at the intervening clearing, before the later
  // duplicate place is reached; either failure is an appropriate refusal.
  assert.throws(()=>auditChronologyV1(db.db),/Chronology v1 mismatch/);
});
test('v1 refuses an arrival identity removed from its receipt',t=>{
  const db=setup(t);
  history(db);
  db.db.prepare("UPDATE events SET placed_item_id=NULL WHERE event_id='place-1'").run();
  assert.throws(()=>auditChronologyV1(db.db),/invalid or duplicate arrival/);
});
test('a v0 bench with recorded history is not silently upgraded to v1',t=>{
  const dir=mkdtempSync(join(tmpdir(),'chronology-v0-'));
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const path=join(dir,'old.db'),old=new SqliteBenchSurfaceStore(path);
  old.createBench('old-growth',workshop);
  old.place('old-growth',item(1),alice,0,'place-1');
  old.close();
  assert.throws(()=>new ChronologyV1BenchStore(path),/cannot be promoted/);
  const reopened=new SqliteBenchSurfaceStore(path);
  try{
    assert.equal(reopened.readActive('old-growth',alice).generation,1);
    assert.equal(reopened.db.prepare('PRAGMA user_version').get().user_version,0);
  } finally { reopened.close(); }
});
test('failed placement cannot create an orphan v1 arrival receipt',t=>{
  const db=setup(t);
  db.place('old-growth',item(1),alice,0,'place-1');
  assert.throws(()=>db.place('old-growth',item(1),alice,1,'place-again'));
  assert.equal(db.db.prepare('SELECT COUNT(*) AS n FROM events').get().n,1);
  assert.equal(auditChronologyV1(db.db),true);
});
