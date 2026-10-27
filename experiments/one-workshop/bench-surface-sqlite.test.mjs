import test from 'node:test';
import assert from 'node:assert/strict';
import { setup, populate, item, ids, workshop, alice, bob, guest } from './bench-sqlite-fixtures.mjs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SqliteBenchSurfaceStore } from './bench-surface-sqlite.mjs';
test('fourteen locators clear and restore across different workers, with warnings intact', t => {
  const { db } = setup(t);
  let gen = populate(db);
  gen = db.clear('old-growth', 'batch-14', ids, alice, gen, 'clear-14');
  assert.equal(db.readActive('old-growth', bob).activeItems.length, 0);
  assert.equal(db.readBatch('old-growth', 'batch-14', bob).items.length, 14);
  gen = db.restore('old-growth', 'batch-14', bob, gen, 'restore-14');
  const back = db.readActive('old-growth', alice);
  assert.equal(back.generation, gen);
  assert.equal(back.activeItems.length, 14);
  assert.deepEqual(back.activeItems.find(x => x.itemId === 'leaf-7').warningIds, ['unresolved-warning-7']);
  assert.equal(db.readBatch('old-growth', 'batch-14', bob).restoredBy, 'bob');
  assert.deepEqual(db.readTrace('old-growth', alice, { after: 14 }).map(x => x.kind), ['clear', 'restore']);
});

test('new arrival after clearing is preserved when the old batch returns', t => {
  const { db } = setup(t);
  let gen = populate(db);
  gen = db.clear('old-growth', 'batch-14', ids, alice, gen, 'clear-14');
  gen = db.place('old-growth', item(15), bob, gen, 'place-15');
  gen = db.restore('old-growth', 'batch-14', bob, gen, 'restore-14');
  assert.equal(db.readActive('old-growth', alice).activeItems.length, 15);
  assert.equal(db.readActive('old-growth', alice).activeItems.filter(x => x.itemId === 'leaf-15').length, 1);
});

test('SQLite persistence survives close and reopening, with original clearing trace', t => {
  const dir = mkdtempSync(join(tmpdir(), 'bench-reopen-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, 'state.sqlite');
  let db = new SqliteBenchSurfaceStore(path);
  db.createBench('old-growth', workshop);
  let gen = db.place('old-growth', item(7), alice, 0, 'place-7');
  gen = db.clear('old-growth', 'batch-1', ['leaf-7'], alice, gen, 'clear-1');
  db.close();
  db = new SqliteBenchSurfaceStore(path);
  try {
    assert.equal(db.readBatch('old-growth', 'batch-1', bob).items[0].warningIds[0], 'unresolved-warning-7');
    assert.equal(db.readNoticeSuggestions('old-growth', bob).length, 1);
    gen = db.restore('old-growth', 'batch-1', bob, gen, 'restore-1');
    assert.equal(db.readActive('old-growth', bob).activeItems.length, 1);
    assert.equal(db.readTrace('old-growth', alice).length, 3);
  } finally { db.close(); }
});

test('independent connections cannot both commit against the same generation', t => {
  const { db, path } = setup(t);
  const second = new SqliteBenchSurfaceStore(path);
  t.after(() => second.close());
  const observed = db.readActive('old-growth', alice).generation;
  const after = db.place('old-growth', item(1), alice, observed, 'place-1');
  assert.throws(() => second.place('old-growth', item(2), bob, observed, 'place-2'), /Stale/);
  assert.equal(second.readActive('old-growth', bob).generation, after);
  assert.deepEqual(second.readActive('old-growth', bob).activeItems.map(x => x.itemId), ['leaf-1']);
});

test('invalid clear and duplicate event IDs roll back every partial write', t => {
  const { db } = setup(t);
  const gen = populate(db);
  assert.throws(() => db.clear('old-growth', 'batch-bad', ids.slice(0, 13), alice, gen, 'bad-clear'), /exactly/);
  assert.throws(() => db.clear('old-growth', 'batch-bad', [...ids.slice(0, 13), 'missing'], alice, gen, 'bad-clear'), /exactly/);
  assert.throws(() => db.clear('old-growth', 'batch-good', ids, alice, gen, 'place-1'), /UNIQUE/);
  assert.equal(db.readActive('old-growth', alice).generation, gen);
  assert.equal(db.readActive('old-growth', alice).activeItems.length, 14);
  assert.equal(db.readBatch('old-growth', 'batch-good', alice), null);
});

test('restoration cannot replay the same batch or silently replace another batch', t => {
  const { db } = setup(t);
  let gen = populate(db);
  gen = db.clear('old-growth', 'batch-14', ids, alice, gen, 'clear-14');
  gen = db.restore('old-growth', 'batch-14', bob, gen, 'restore-14');
  assert.throws(() => db.restore('old-growth', 'batch-14', bob, gen, 'restore-again'), /already restored/);
  gen = db.clear('old-growth', 'batch-again', ids, bob, gen, 'clear-again');
  assert.equal(db.readBatch('old-growth', 'batch-14', alice).restored, true);
  assert.equal(db.readBatch('old-growth', 'batch-again', alice).restored, false);
});
