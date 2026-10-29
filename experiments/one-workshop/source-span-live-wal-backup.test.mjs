// Fictional, local-only WAL crossing test. A raw copy of an open SQLite
// main file is NOT a portable snapshot; Node SQLite online backup is a
// consistent committed snapshot. Neither is an authenticated archive,
// permission grant, complete Workshop export, or tested multi-host transfer.
import test from 'node:test';
import assert from 'node:assert/strict';
import { backup, DatabaseSync } from 'node:sqlite';
import { copyFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SourceSpanCatalog } from './source-span-catalog.mjs';
import { makeSourceSnapshot, bindSourceSpan } from './source-span.mjs';

const alice = { authenticated:true, workshopMember:true, principalId:'alice' };
const bob = { authenticated:true, workshopMember:true, principalId:'bob' };
const workshop = { kind:'workshop' };
const privateBob = { kind:'private', ownerId:'bob' };
const body = 'An invented witness wrote the fictional letter under a blue lamp.';
const phrase = 'fictional letter';
const source = makeSourceSnapshot('fictional-wal-source', 'revision-1', body);

function receipt(id) {
  const start = body.indexOf(phrase);
  return bindSourceSpan({
    id, snapshot:source, start, end:start+phrase.length, exactText:phrase,
    originalPointer:'fictional:unverified-letter',
    originalLocator:'invented-page-1', originalMaker:'invented maker',
    readingHand:'test reader', claim:'Fiction only.',
    limit:'No real historical document or permission was authenticated.'
  });
}

function home(t) {
  const dir = mkdtempSync(join(tmpdir(), 'source-span-live-wal-'));
  t.after(() => rmSync(dir, { recursive:true, force:true }));
  const filename = join(dir, 'live.sqlite');
  // Close the initial connection so the schema is safely in the main file.
  // Later receipts will be committed into the live WAL, not yet checkpointed.
  const bootstrap = new SourceSpanCatalog(filename);
  bootstrap.close();
  const live = new SourceSpanCatalog(filename);
  t.after(() => live.close());
  return { dir, filename, live };
}

test('copying only the main SQLite file during WAL activity can omit a committed span', t => {
  const { dir, filename, live } = home(t);
  live.register(receipt('committed'), source, workshop, alice);
  assert.equal(live.listVisible(alice).length, 1);
  assert.ok(existsSync(filename + '-wal'), 'live source has a WAL sidecar');
  const copiedMain = join(dir, 'main-only.sqlite');
  copyFileSync(filename, copiedMain); // Deliberately WRONG portable practice.
  const copied = new DatabaseSync(copiedMain, { readOnly:true });
  try {
    assert.equal(copied.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
    assert.equal(copied.prepare('SELECT COUNT(*) AS n FROM source_span_catalog').get().n, 0,
      'an apparently valid main-file copy silently missed the committed WAL row');
  } finally { copied.close(); }
  assert.equal(live.listVisible(alice).length, 1,
    'the source still has the committed receipt');
});

test('SQLite online backup captures live WAL receipts and freezes before later arrivals', async t => {
  const { dir, live } = home(t);
  live.register(receipt('publicly-unpublished'), source, workshop, alice);
  live.register(receipt('bob-private'), source, privateBob, bob);
  const exported = join(dir, 'consistent-snapshot.sqlite');
  await backup(live.db, exported); // Live writer remains open.
  live.register(receipt('after-snapshot'), source, workshop, alice);
  assert.deepEqual(live.listVisible(alice).map(x => x.spanId),
    ['after-snapshot', 'publicly-unpublished']);
  const received = new SourceSpanCatalog(exported);
  t.after(() => received.close());
  assert.equal(received.db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
  assert.deepEqual(received.listVisible(alice).map(x => x.spanId),
    ['publicly-unpublished']);
  assert.equal(received.read('publicly-unpublished', alice, source).exactText, phrase);
  assert.equal(received.read('bob-private', alice, { body:'unrelated' }), null);
  assert.equal(received.read('bob-private', bob, source).exactText, phrase);
  assert.equal(received.read('after-snapshot', alice, source), null);
  // The snapshot holds ALL local compartments: it must remain private.
  const total = received.db.prepare('SELECT COUNT(*) AS n FROM source_span_catalog').get().n;
  assert.equal(total, 2);
});
