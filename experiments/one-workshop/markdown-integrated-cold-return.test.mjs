// Fictional integrated cold return: genuine .md revisions, personal folio receipts,
// and verified binary objects. A fresh Node receiver has no sender database.
// This is a bounded model test, NOT an importer for live Workshop holdings.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync,
  copyFileSync, cpSync, unlinkSync, existsSync, readdirSync, lstatSync, symlinkSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RECORD_SCHEMA, readCarrier, rebuildIndex, readDerivedIndex } from './markdown-rebuild.mjs';
import { fingerprintBlob, receiveVerifiedBlob, verifyBlob } from './blob-integrity.mjs';
import { exportBlobManifest, parseBlobManifest } from './blob-transfer.mjs';
import {
  emptyFolioHistory, receiveFolioVersion, exportFolioHistory,
  parseFolioHistory, recoverFolioVersion, recoverLatestFolio
} from './native-folio-history.mjs';

const ID = 'public-lands-return-3-face-111';
const SCHEMA = 'earthlyhands.markdown-integrated-return-fixture.v0';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const self = fileURLToPath(import.meta.url);
const texts = [
  Buffer.from('# Fictional first reading\r\nCafé and river\r\n'),
  Buffer.from('# Fictional approved reading\n\nA public question.\n'),
  Buffer.from('# Fictional private continuation\n\nNot released.\n')
];
const nativeFolio = (edition, note) => JSON.stringify({
  v: 1, source: ID, format: 'Earthly Hands / Public Lands / folio v1',
  workingReadingEdition: edition, note, occurrences: [], marks: []
}) + '\n';
const firstNote = nativeFolio('invented-edition-one', 'First private thought');
const secondNote = nativeFolio('invented-edition-two', 'Second private thought');

function exact(obj, keys) {
  return obj && typeof obj === 'object' && !Array.isArray(obj) &&
    Object.keys(obj).sort().join(',') === keys.slice().sort().join(',');
}

function carrierDir(root) {
  return join(root, 'carriers', ID);
}
function recordPath(root) {
  return join(carrierDir(root), 'record.json');
}
function folioPath(root) {
  return join(root, 'personal', 'folio-history.json');
}
function blobManifestPath(root) {
  return join(root, 'blob-manifest.json');
}
function handoffPath(root) {
  return join(root, 'handoff.json');
}
function receiptHash(root, path) {
  return hash(readFileSync(join(root, path)));
}
function readHandoff(root) {
  const x = JSON.parse(readFileSync(handoffPath(root), 'utf8'));
  const keys = ['schema', 'carrier', 'recordSHA256', 'folioSHA256', 'blobManifestSHA256'];
  if (!exact(x, keys) || x.schema !== SCHEMA || x.carrier !== ID ||
      ![x.recordSHA256, x.folioSHA256, x.blobManifestSHA256]
        .every(v => typeof v === 'string' && /^[0-9a-f]{64}$/.test(v))) {
    throw Error('Unsupported integrated handoff receipt');
  }
  for (const [name, path] of [
    ['recordSHA256', join('carriers', ID, 'record.json')],
    ['folioSHA256', join('personal', 'folio-history.json')],
    ['blobManifestSHA256', 'blob-manifest.json']
  ]) {
    if (receiptHash(root, path) !== x[name]) throw Error('Handoff receipt bytes disagree: ' + name);
  }
  return x;
}

// The handoff receipts cover claimed carriers, not arbitrary extra files.
// Refuse unlisted files and symlinks rather than declaring a mixed folder a
// complete received archive. This is the one-carrier fixture's inventory,
// NOT a general archive format or a public/private access-control scheme.
function exactEntries(dir, names) {
  const stat = lstatSync(dir);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw Error('Unsupported receiving inventory: directory is not an ordinary directory');
  }
  const got = readdirSync(dir).sort();
  if (got.join('\\n') !== names.slice().sort().join('\\n')) {
    throw Error('Unsupported receiving inventory: unreceipted or missing entry');
  }
}
function ordinaryFile(file) {
  const stat = lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw Error('Unsupported receiving inventory: file is not an ordinary file');
  }
}
function preflightReceivedInventory(root, carrier, blobs) {
  exactEntries(root, ['blob-manifest.json', 'carriers', 'handoff.json', 'objects', 'personal']);
  exactEntries(join(root, 'carriers'), [ID]);
  exactEntries(carrierDir(root), ['record.json', 'revisions']);
  exactEntries(join(carrierDir(root), 'revisions'), carrier.revisions.map(r =>
    String(r.revision).padStart(4, '0') + '.md'));
  exactEntries(join(root, 'personal'), ['folio-history.json']);
  exactEntries(join(root, 'objects'), ['sha256']);
  exactEntries(join(root, 'objects', 'sha256'), blobs.objects.map(x => x.sha256));
  ordinaryFile(recordPath(root));
  ordinaryFile(handoffPath(root));
  ordinaryFile(folioPath(root));
  ordinaryFile(blobManifestPath(root));
  for (const rev of carrier.revisions) {
    ordinaryFile(join(carrierDir(root), 'revisions',
      String(rev.revision).padStart(4, '0') + '.md'));
  }
  for (const object of blobs.objects) ordinaryFile(join(root, 'objects', object.object_key));
}

async function receiveOnFreshProcess(root, indexPath) {
  // No index is created until ALL received carriers, histories and blobs pass.
  // An existing derived index is not an import/overwrite target.
  if (existsSync(indexPath)) throw Error('Fresh receiver refuses existing index');
  readHandoff(root);
  const carrier = readCarrier(join(root, 'carriers'), ID);
  const personal = parseFolioHistory(readFileSync(folioPath(root), 'utf8'));
  if (personal.source !== carrier.id || personal.receipts.length !== 2)
    throw Error('Fictional folio history does not match source carrier');
  const blobs = parseBlobManifest(readFileSync(blobManifestPath(root), 'utf8'));
  if (blobs.objects.length !== 1) throw Error('Fictional fixture expects one binary');
  preflightReceivedInventory(root, carrier, blobs);
  for (const object of blobs.objects) {
    await verifyBlob(join(root, 'objects', object.object_key), object);
  }
  const rebuilt = rebuildIndex(join(root, 'carriers'), indexPath);
  const rows = readDerivedIndex(indexPath);
  if (rows.length !== 1 || rows[0].id !== ID) throw Error('Derived index not as expected');
  return {
    revisions: carrier.revisions.length,
    receivedOriginalMarkdown: true,
    folioVersions: personal.receipts.length,
    earlierVisitorNoteRecoverable: recoverFolioVersion(personal, 0) === firstNote,
    latestVisitorNoteRecoverable: recoverLatestFolio(personal) === secondNote,
    verifiedObjectBytes: blobs.objects[0].bytes,
    publishedRevisionClaim: rows[0].public_revision,
    privateRevisionAbsentFromPublic: !rows[0].public_text.includes('Not released.'),
    rebuilt
  };
}

function receive(root, indexPath) {
  const result = spawnSync(process.execPath, [self, '--receive', root, indexPath],
    { encoding: 'utf8', timeout: 30000 });
  assert.ifError(result.error);
  return result;
}

async function fixture(t) {
  const work = mkdtempSync(join(tmpdir(), 'one-workshop-markdown-integrated-'));
  t.after(() => rmSync(work, { recursive: true, force: true }));
  const source = join(work, 'source');
  const received = join(work, 'received');
  const index = join(work, 'new-index.sqlite');
  const revisions = join(carrierDir(source), 'revisions');
  mkdirSync(revisions, { recursive: true });
  const records = texts.map((bytes, i) => {
    const rev = i + 1;
    writeFileSync(join(revisions, String(rev).padStart(4, '0') + '.md'), bytes);
    return { revision: rev, bytes: bytes.length, sha256: hash(bytes) };
  });
  const record = {
    schema: RECORD_SCHEMA, id: ID, sourceClaim: 'fictional-invented-only',
    rightsState: 'affirmed', revisions: records,
    publication: { revision: 2, approvalClaim: 'fictional-approval-not-real-authority' }
  };
  writeFileSync(recordPath(source), JSON.stringify(record, null, 2) + '\n');
  mkdirSync(join(source, 'personal'), { recursive: true });
  let folio = receiveFolioVersion(emptyFolioHistory(), firstNote);
  folio = receiveFolioVersion(folio, secondNote);
  writeFileSync(folioPath(source), exportFolioHistory(folio));
  const inventedFile = join(work, 'invented-binary');
  writeFileSync(inventedFile, Buffer.alloc(256 * 1024, 0x5a));
  const fingerprint = await fingerprintBlob(inventedFile);
  await receiveVerifiedBlob(inventedFile, join(source, 'objects'), fingerprint);
  const manifest = await exportBlobManifest(join(source, 'objects'), [fingerprint]);
  writeFileSync(blobManifestPath(source), JSON.stringify(manifest, null, 2) + '\n');
  writeFileSync(handoffPath(source), JSON.stringify({
    schema: SCHEMA, carrier: ID,
    recordSHA256: receiptHash(source, join('carriers', ID, 'record.json')),
    folioSHA256: receiptHash(source, join('personal', 'folio-history.json')),
    blobManifestSHA256: receiptHash(source, 'blob-manifest.json')
  }, null, 2) + '\n');

  // Copy complete carriers without copying a sender SQLite database or index.
  cpSync(source, received, { recursive: true });
  return { work, source, received, index, record, fingerprint };
}

if (process.argv[2] === '--receive') {
  try {
    if (process.argv.length !== 5) throw Error('Receiver requires two local fixture paths');
    console.log(JSON.stringify(await receiveOnFreshProcess(process.argv[3], process.argv[4])));
  } catch (error) {
    console.error('Integrated cold return refused: ' + error.message);
    process.exitCode = 1;
  }
} else {
  test('fresh receiver rebuilds actual .md with pinned public view, two folio versions and verified binary', async t => {
    const f = await fixture(t);
    assert.equal(existsSync(f.index), false);
    const sourceReceipt = readFileSync(recordPath(f.source));
    const original = texts.map((_, i) => readFileSync(
      join(carrierDir(f.source), 'revisions', String(i + 1).padStart(4, '0') + '.md')));
    const result = receive(f.received, f.index);
    assert.equal(result.status, 0, result.stderr);
    const witness = JSON.parse(result.stdout);
    assert.equal(witness.revisions, 3);
    assert.equal(witness.folioVersions, 2);
    assert.equal(witness.earlierVisitorNoteRecoverable, true);
    assert.equal(witness.latestVisitorNoteRecoverable, true);
    assert.equal(witness.publishedRevisionClaim, 2);
    assert.equal(witness.privateRevisionAbsentFromPublic, true);
    assert.equal(witness.verifiedObjectBytes, 256 * 1024);
    const row = readDerivedIndex(f.index)[0];
    assert.equal(row.latest_revision, 3);
    assert.equal(row.public_revision, 2);
    assert.equal(row.public_text, texts[1].toString('utf8'));
    assert.ok(!row.public_text.includes('Not released.'));
    for (let i = 0; i < 3; i++) {
      assert.deepEqual(readFileSync(join(carrierDir(f.received), 'revisions',
        String(i + 1).padStart(4, '0') + '.md')), original[i]);
    }
    const arrival = parseFolioHistory(readFileSync(folioPath(f.received), 'utf8'));
    assert.equal(recoverFolioVersion(arrival, 0), firstNote);
    assert.equal(recoverFolioVersion(arrival, 1), secondNote);
    assert.deepEqual(readFileSync(recordPath(f.source)), sourceReceipt);
    assert.equal(existsSync(join(f.source, 'new-index.sqlite')), false);

    // One additional PRIVATE revision can be written using the received .md
    // carrier. This is single-writer continuation, not concurrent CAS.
    const continuation = Buffer.from('# New private receiver-only draft\n');
    const path = join(carrierDir(f.received), 'revisions', '0004.md');
    writeFileSync(path, continuation);
    const record = JSON.parse(readFileSync(recordPath(f.received), 'utf8'));
    record.revisions.push({ revision: 4, bytes: continuation.length, sha256: hash(continuation) });
    writeFileSync(recordPath(f.received), JSON.stringify(record, null, 2) + '\n');
    assert.deepEqual(rebuildIndex(join(f.received, 'carriers'), f.index), { indexed: 1, revisions: 4 });
    assert.equal(readDerivedIndex(f.index)[0].public_text, texts[1].toString('utf8'));
    assert.equal(readCarrier(join(f.source, 'carriers'), ID).revisions.length, 3);
  });

  test('tampered Markdown bytes are refused before creating the receiver index', async t => {
    const f = await fixture(t);
    writeFileSync(join(carrierDir(f.received), 'revisions', '0002.md'), 'edited without receipt');
    const result = receive(f.received, f.index);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Markdown bytes disagree/);
    assert.equal(existsSync(f.index), false);
    assert.deepEqual(readFileSync(join(carrierDir(f.source), 'revisions', '0002.md')), texts[1]);
  });

  test('future rights field is retained and refused before index creation', async t => {
    const f = await fixture(t);
    const raw = readFileSync(recordPath(f.received), 'utf8');
    const record = JSON.parse(raw);
    record.permissionHistory = [{ kind: 'unknown-future-claim' }];
    writeFileSync(recordPath(f.received), JSON.stringify(record, null, 2) + '\n');
    const result = receive(f.received, f.index);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Handoff receipt bytes disagree/);
    assert.equal(existsSync(f.index), false);
    assert.ok(readFileSync(recordPath(f.received), 'utf8').includes('permissionHistory'));
    // Even when a bad actor recomputes its own checksum, the old parser
    // still refuses the unrecognized rights field rather than dropping it.
    const handoff = JSON.parse(readFileSync(handoffPath(f.received), 'utf8'));
    handoff.recordSHA256 = hash(readFileSync(recordPath(f.received)));
    writeFileSync(handoffPath(f.received), JSON.stringify(handoff, null, 2) + '\n');
    const retry = receive(f.received, f.index);
    assert.equal(retry.status, 1);
    assert.match(retry.stderr, /Unsupported Markdown sidecar/);
    assert.equal(existsSync(f.index), false);
  });

  test('altered personal history cannot silently replace earlier note', async t => {
    const f = await fixture(t);
    const changed = readFileSync(folioPath(f.received), 'utf8').replace('First private thought', 'Changed private thought');
    writeFileSync(folioPath(f.received), changed);
    const result = receive(f.received, f.index);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Handoff receipt bytes disagree: folioSHA256/);
    assert.equal(existsSync(f.index), false);
    assert.equal(recoverFolioVersion(parseFolioHistory(readFileSync(folioPath(f.source), 'utf8')), 0), firstNote);
  });

  test('interrupted binary copy is refused, but intact files can complete the later cold return', async t => {
    const f = await fixture(t);
    unlinkSync(join(f.received, 'objects', f.fingerprint.object_key));
    const refused = receive(f.received, f.index);
    assert.equal(refused.status, 1);
    assert.equal(existsSync(f.index), false);
    assert.equal(readCarrier(join(f.received, 'carriers'), ID).revisions.length, 3);
    copyFileSync(join(f.source, 'objects', f.fingerprint.object_key),
      join(f.received, 'objects', f.fingerprint.object_key));
    const retried = receive(f.received, f.index);
    assert.equal(retried.status, 0, retried.stderr);
    assert.equal(readDerivedIndex(f.index)[0].public_revision, 2);
  });

  test('existing derived index is never treated as a silent import replacement', async t => {
    const f = await fixture(t);
    writeFileSync(f.index, 'keep existing destination bytes');
    const before = readFileSync(f.index);
    const result = receive(f.received, f.index);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /refuses existing index/);
    assert.deepEqual(readFileSync(f.index), before);
  });

  test('unlisted top-level and private personal files cannot hitchhike in a clean return', async t => {
    for (const name of ['unlisted-root', 'unlisted-personal']) {
      const f = await fixture(t);
      const extra = name === 'unlisted-root' ? join(f.received, '.env') :
        join(f.received, 'personal', 'bystander-notes.json');
      writeFileSync(extra, 'invented secret not in handoff receipts');
      const result = receive(f.received, f.index);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /Unsupported receiving inventory/);
      assert.equal(existsSync(f.index), false);
      assert.equal(existsSync(extra), true);
    }
  });

  test('unlisted binary and symlinked claimed object refuse before index creation', async t => {
    const extra = await fixture(t);
    const stray = join(extra.received, 'objects', 'sha256', 'unreceipted-object');
    writeFileSync(stray, 'not in the manifest');
    const refused = receive(extra.received, extra.index);
    assert.equal(refused.status, 1);
    assert.match(refused.stderr, /Unsupported receiving inventory/);
    assert.equal(existsSync(extra.index), false);

    const linkFixture = await fixture(t);
    const expected = join(linkFixture.received, 'objects', linkFixture.fingerprint.object_key);
    unlinkSync(expected);
    symlinkSync(join(linkFixture.source, 'objects', linkFixture.fingerprint.object_key), expected);
    const viaLink = receive(linkFixture.received, linkFixture.index);
    assert.equal(viaLink.status, 1);
    assert.match(viaLink.stderr, /Unsupported receiving inventory/);
    assert.equal(existsSync(linkFixture.index), false);
  });

  test('future folio rights field refuses cold receiving even if the local digest is recomputed', async t => {
    const f = await fixture(t);
    const original = readFileSync(folioPath(f.received), 'utf8');
    const later = JSON.parse(original);
    later.receipts[0].permissionHistory = [{ state: 'unknown-from-future' }];
    writeFileSync(folioPath(f.received), JSON.stringify(later, null, 2) + '\n');
    const handoff = JSON.parse(readFileSync(handoffPath(f.received), 'utf8'));
    handoff.folioSHA256 = hash(readFileSync(folioPath(f.received)));
    writeFileSync(handoffPath(f.received), JSON.stringify(handoff, null, 2) + '\n');

    const result = receive(f.received, f.index);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Invalid native-folio pocket/);
    assert.equal(existsSync(f.index), false);
    assert.ok(readFileSync(folioPath(f.received), 'utf8').includes('permissionHistory'));
    assert.equal(readFileSync(folioPath(f.source), 'utf8'), original);
  });

}
