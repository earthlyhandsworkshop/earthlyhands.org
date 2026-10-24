import test from 'node:test';
import assert from 'node:assert/strict';
import {newDocument, parseDocument, saveRevision, approveRevision, publicText, exportDocument} from './model.mjs';

test('private text stays private until approval', () => {
  let d = saveRevision(newDocument(), 'Private draft', 1);
  assert.equal(publicText(d), null);
  d = approveRevision(d, 2);
  assert.equal(publicText(d), 'Private draft');
});

test('public snapshot remains pinned after subsequent edits', () => {
  let d = approveRevision(saveRevision(newDocument(), 'Release', 1), 2);
  d = saveRevision(d, 'Later working text', 2);
  assert.equal(publicText(d), 'Release');
  assert.equal(d.working_revision, 3);
});

test('stale revisions cannot overwrite later revisions', () => {
  const d = saveRevision(newDocument(), 'Hand A', 1);
  assert.throws(() => saveRevision(d, 'Hand B', 1), /Stale revision/);
  assert.throws(() => approveRevision(d, 1), /Stale revision/);
});

test('an export can be reimported without losing history or release', () => {
  let d = approveRevision(saveRevision(newDocument(), 'Release', 1), 2);
  d = saveRevision(d, 'Draft', 2);
  assert.deepEqual(parseDocument(exportDocument(d)), d);
});

test('inconsistent release records and identity are rejected', () => {
  const d = approveRevision(newDocument(), 1);
  const inconsistent = structuredClone(d);
  inconsistent.publication.content = 'Different text';
  assert.throws(() => parseDocument(inconsistent), /Public release/);
  const other = structuredClone(d);
  other.id = 'eh:test:other';
  assert.throws(() => parseDocument(other), /identity/);
});
