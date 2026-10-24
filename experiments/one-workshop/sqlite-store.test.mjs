// Isolated storage tests. Node 22+; no production or Drive data.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SqliteDocumentStore, VersionConflict } from './sqlite-store.mjs';
import { DOCUMENT_ID, exportDocument } from './model.mjs';

function temporaryPath(t) {
  const dir = mkdtempSync(join(tmpdir(), 'one-workshop-test-'));
  t.after(() => rmSync(dir, {recursive: true, force: true}));
  return join(dir, 'document.db');
}

test('a later private draft never changes the pinned public projection', t => {
  const path = temporaryPath(t);
  const store = new SqliteDocumentStore(path);
  assert.equal(store.readPublic(), null);
  store.save('Approved text', 1);
  store.approve(2);
  store.save('Private later text', 3);
  store.close();

  const reopened = new SqliteDocumentStore(path);
  try {
    assert.equal(reopened.readWorking().generation, 4);
    assert.equal(reopened.readWorking().document.history.at(-1).content, 'Private later text');
    assert.deepEqual(reopened.readPublic(), {id: DOCUMENT_ID, revision: 2, content: 'Approved text'});
    assert.ok(!JSON.stringify(reopened.readPublic()).includes('Private later text'));
  } finally { reopened.close(); }
});

test('two independent connections reject stale writes and approvals', t => {
  const path = temporaryPath(t);
  const a = new SqliteDocumentStore(path);
  const b = new SqliteDocumentStore(path);
  try {
    assert.equal(a.readWorking().generation, b.readWorking().generation);
    a.save('First hand', 1);
    assert.throws(() => b.save('Second hand', 1), VersionConflict);
    assert.throws(() => b.approve(1), VersionConflict);
    assert.equal(b.readWorking().document.history.at(-1).content, 'First hand');
    assert.equal(b.readPublic(), null);
  } finally { a.close(); b.close(); }
});

test('a portable export restores into a fresh store, but cannot replace live work', t => {
  const source = new SqliteDocumentStore(temporaryPath(t));
  source.save('Published edition', 1);
  source.approve(2);
  source.save('Private continuation', 3);
  const exported = exportDocument(source.readWorking().document);
  const published = source.readPublic();
  source.close();

  const dest = new SqliteDocumentStore(temporaryPath(t));
  try {
    const imported = dest.restore(exported, 1);
    assert.equal(imported.document.history.length, 3);
    assert.deepEqual(dest.readPublic(), published);
    assert.equal(dest.readWorking().document.history.at(-1).content, 'Private continuation');
    const previous = dest.readWorking();
    assert.throws(() => dest.restore(exported, previous.generation), /not a pristine store/);
    assert.deepEqual(dest.readWorking(), previous);
    assert.deepEqual(dest.readPublic(), published);
    const tampered = JSON.parse(exported);
    tampered.publication.content = 'Fabricated release';
    assert.throws(() => dest.restore(tampered, previous.generation), /Public release/);
    assert.deepEqual(dest.readPublic(), published);
  } finally { dest.close(); }
});
