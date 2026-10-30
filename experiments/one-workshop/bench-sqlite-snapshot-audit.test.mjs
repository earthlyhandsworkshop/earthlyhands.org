// Adversarial offline snapshots with *recomputed* hashes. This deliberately
// tests internal receipt coherence, not cryptographic origin or authorization.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync, rmSync, readFileSync, copyFileSync, existsSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { setup, item, alice } from './bench-sqlite-fixtures.mjs';
import {
  BENCH_SNAPSHOT_SCHEMA, exportBenchSnapshot, importBenchSnapshot
} from './bench-sqlite-backup.mjs';

function scratch(t) {
  const dir = mkdtempSync(join(tmpdir(), 'bench-receipt-audit-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}
function forgedManifest(path, original) {
  const data = readFileSync(path);
  return {
    ...original, schema: BENCH_SNAPSHOT_SCHEMA, format: 'sqlite3',
    bytes: data.length, sha256: createHash('sha256').update(data).digest('hex')
  };
}
async function rejectTampered(t, populate, change, expected = /Snapshot receipt graph mismatch/) {
  const { db } = setup(t);
  populate(db);
  const dir = scratch(t), source = join(dir, 'source.sqlite');
  const tampered = join(dir, 'tampered.sqlite');
  const destination = join(dir, 'received.sqlite');
  const manifest = await exportBenchSnapshot(db, source);
  copyFileSync(source, tampered);
  const handle = new DatabaseSync(tampered);
  try { change(handle); } finally { handle.close(); }
  const claim = forgedManifest(tampered, manifest);
  // The bytes are intact and the manifest agrees, yet the receipt story lies.
  await assert.rejects(importBenchSnapshot(tampered, destination, claim), expected);
  assert.equal(existsSync(destination), false);
}
function oneCleared(db) {
  const gen = db.place('old-growth', item(7), alice, 0, 'place-7');
  db.clear('old-growth', 'batch-7', ['leaf-7'], alice, gen, 'clear-7');
}
function twoCleared(db) {
  let gen = db.place('old-growth', item(1), alice, 0, 'place-1');
  gen = db.place('old-growth', item(2), alice, gen, 'place-2');
  db.clear('old-growth', 'batch-2', ['leaf-1', 'leaf-2'], alice, gen, 'clear-2');
}

test('a new event kind is not legitimate merely because event counts and SHA-256 match', async t =>
  rejectTampered(t, db => db.place('old-growth', item(1), alice, 0, 'place-1'),
    db => db.prepare("UPDATE events SET kind='erase' WHERE event_id='place-1'").run()));

test('a clearing receipt cannot silently name a different clearing hand', async t =>
  rejectTampered(t, oneCleared,
    db => db.prepare("UPDATE events SET actor='stranger' WHERE event_id='clear-7'").run()));

test('a restored_by claim requires a real, later restore event', async t =>
  rejectTampered(t, oneCleared,
    db => db.prepare("UPDATE batches SET restored_by='bob' WHERE batch_id='batch-7'").run()));

test('a clearing batch must have exactly contiguous member ordinals', async t =>
  rejectTampered(t, twoCleared,
    db => db.prepare("UPDATE batch_items SET ordinal=0 WHERE item_id='leaf-2'").run()));

test('an inactive locator cannot be relabelled active after an unrestored clear', async t =>
  rejectTampered(t, oneCleared,
    db => db.prepare("UPDATE items SET active=1 WHERE item_id='leaf-7'").run()));

test('a clearing event must count its exact batch members', async t =>
  rejectTampered(t, oneCleared,
    db => db.prepare("UPDATE events SET item_count=3 WHERE event_id='clear-7'").run()));

test('a fabricated batch without any clear receipt is refused', async t =>
  rejectTampered(t, oneCleared,
    db => db.prepare("INSERT INTO batches(bench_id,batch_id,cleared_by) VALUES ('old-growth','ghost','alice')").run()));

test('a place receipt cannot smuggle a batch ID or incorrect item count', async t =>
  rejectTampered(t, db => db.place('old-growth', item(1), alice, 0, 'place-1'),
    db => db.prepare("UPDATE events SET batch_id='ghost',item_count=2 WHERE event_id='place-1'").run()));

test('restoration may not be represented as a second clearing', async t =>
  rejectTampered(t, db => {
    let gen = db.place('old-growth', item(7), alice, 0, 'place-7');
    gen = db.clear('old-growth', 'batch-7', ['leaf-7'], alice, gen, 'clear-7');
    db.restore('old-growth', 'batch-7', alice, gen, 'restore-7');
  }, db => db.prepare("UPDATE events SET kind='clear' WHERE event_id='restore-7'").run()));

test('an extra place receipt cannot exceed the actual item table', async t =>
  rejectTampered(t, oneCleared,
    db => db.prepare("UPDATE events SET kind='place',batch_id=NULL,item_count=1 WHERE event_id='clear-7'").run()));

test('a valid snapshot still crosses an offline file boundary', async t => {
  const { db } = setup(t), dir = scratch(t);
  let gen = db.place('old-growth', item(7), alice, 0, 'place-7');
  gen = db.clear('old-growth', 'batch-7', ['leaf-7'], alice, gen, 'clear-7');
  db.restore('old-growth', 'batch-7', alice, gen, 'restore-7');
  const source = join(dir, 'source.sqlite'), dest = join(dir, 'received.sqlite');
  const manifest = await exportBenchSnapshot(db, source);
  await importBenchSnapshot(source, dest, manifest);
  assert.equal(existsSync(dest), true);
});

test('KNOWN v0 LIMIT: a forged member placed after clearing can pass the receipt count audit', async t => {
  // Proof of an *unclosed* boundary, not a desired authorization outcome:
  // v0 place events record only a count, not the item ID. A forged snapshot
  // can name a future item in an earlier clearing without breaking counts.
  const { db } = setup(t), dir = scratch(t);
  let gen = db.place('old-growth', item(1), alice, 0, 'place-1');
  gen = db.place('old-growth', item(2), alice, gen, 'place-2');
  gen = db.clear('old-growth', 'batch-2', ['leaf-1','leaf-2'], alice, gen, 'clear-2');
  gen = db.restore('old-growth', 'batch-2', alice, gen, 'restore-2');
  db.place('old-growth', item(3), alice, gen, 'place-3');

  const source = join(dir, 'original.sqlite');
  const altered = join(dir, 'forged.sqlite');
  const received = join(dir, 'received.sqlite');
  const manifest = await exportBenchSnapshot(db, source);
  copyFileSync(source, altered);
  const handle = new DatabaseSync(altered);
  try {
    handle.prepare("UPDATE batch_items SET item_id='leaf-3' WHERE bench_id='old-growth' AND batch_id='batch-2' AND item_id='leaf-2'").run();
    assert.deepEqual(handle.prepare("PRAGMA foreign_key_check").all(), []);
  } finally { handle.close(); }
  // This entry was never present at clearing time. We would want a future
  // item-ID-bearing event format to refuse this altered batch.
  const recomputed = forgedManifest(altered, manifest);
  await importBenchSnapshot(altered, received, recomputed);
  const returned = new DatabaseSync(received, { readOnly: true });
  try {
    const members = returned.prepare("SELECT item_id FROM batch_items WHERE batch_id='batch-2' ORDER BY ordinal").all();
    assert.deepEqual(members.map(x => x.item_id), ['leaf-1', 'leaf-3']);
    assert.equal(returned.prepare("SELECT seq FROM events WHERE event_id='place-3'").get().seq, 5);
    assert.equal(returned.prepare("SELECT seq FROM events WHERE event_id='clear-2'").get().seq, 3);
  } finally { returned.close(); }
});
