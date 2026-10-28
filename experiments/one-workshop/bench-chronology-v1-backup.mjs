// Fictional chronology-v1 Workbench SQLite snapshot/return, local files only.
// Not an authenticated, encrypted, provider-independent or production backup service.
import { backup, DatabaseSync } from 'node:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, link, open, rm, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { accessKey, validateItem } from './bench-sqlite-core.mjs';
import { ChronologyV1BenchStore, auditChronologyV1 } from './bench-chronology-v1.mjs';

export const BENCH_CHRONOLOGY_V1_SNAPSHOT_SCHEMA = 'earthlyhands.workbench.surface-sqlite-snapshot.v1';
const HEX_SHA256 = /^[0-9a-f]{64}$/;

function parseManifest(value) {
  const x = typeof value === 'string' ? JSON.parse(value) : value;
  if (!x || typeof x !== 'object' || Array.isArray(x) ||
      x.schema !== BENCH_CHRONOLOGY_V1_SNAPSHOT_SCHEMA || x.format !== 'sqlite3' ||
      !Number.isSafeInteger(x.bytes) || x.bytes < 1 ||
      typeof x.sha256 !== 'string' || !HEX_SHA256.test(x.sha256) ||
      !Number.isSafeInteger(x.benchCount) || x.benchCount < 0 ||
      !Number.isSafeInteger(x.eventCount) || x.eventCount < 0) {
    throw new Error('Invalid Workbench snapshot manifest');
  }
  return {
    schema: BENCH_CHRONOLOGY_V1_SNAPSHOT_SCHEMA, format: 'sqlite3', bytes: x.bytes,
    sha256: x.sha256, benchCount: x.benchCount, eventCount: x.eventCount
  };
}

// Exported only for verifying a private offline handoff; not a publishing credential.
export function validateChronologyV1SnapshotManifest(value) { return parseManifest(value); }

async function fingerprint(path) {
  const h = createHash('sha256');
  let bytes = 0;
  for await (const chunk of createReadStream(path, { highWaterMark: 64 * 1024 })) {
    bytes += chunk.length;
    if (!Number.isSafeInteger(bytes)) throw new Error('Snapshot too large to count safely');
    h.update(chunk);
  }
  return { bytes, sha256: h.digest('hex') };
}

// A checksum and valid receipts do not mean the file is safe to *run* later.
// A forged SQLite file can carry extra triggers or weakened table constraints,
// which execute only after return. Accept exactly the schema written by this
// v1 fixture; any future migration needs its own deliberate format/version gate.
function refuseUnknownChronologySchema(db) {
  const query = 'SELECT type,name,tbl_name,sql FROM sqlite_schema ORDER BY type,name,tbl_name';
  const expectedStore = new ChronologyV1BenchStore(':memory:');
  const expectedDb = expectedStore.db;
  try {
    const expected = expectedDb.prepare(query).all();
    const actual = db.prepare(query).all();
    if (JSON.stringify(actual) !== JSON.stringify(expected))
      throw new Error('Snapshot schema differs from known Workbench chronology v1 schema');
  } finally { expectedStore.close(); }
}

function inspectChronologySnapshot(path) {
  const db = new DatabaseSync(path, { readOnly: true });
  try {
    const integrity = db.prepare('PRAGMA integrity_check').all();
    if (integrity.length !== 1 || integrity[0].integrity_check !== 'ok')
      throw new Error('Chronology snapshot failed SQLite integrity check');
    if (db.prepare('PRAGMA foreign_key_check').all().length)
      throw new Error('Chronology snapshot contains broken foreign keys');
    if (db.prepare('PRAGMA user_version').get().user_version !== 1)
      throw new Error('Snapshot is not chronology v1');
    refuseUnknownChronologySchema(db);
    // These reads require the actual current bench shape, not just a valid SQLite file.
    db.prepare('SELECT item_id,source_id,access_json,warning_ids_json,active FROM items LIMIT 1').all();
    db.prepare('SELECT bench_id,batch_id,cleared_by,restored_by FROM batches LIMIT 1').all();
    db.prepare('SELECT bench_id,batch_id,item_id,ordinal FROM batch_items LIMIT 1').all();
    const benches = db.prepare(`SELECT b.bench_id,b.access_json,b.generation, COUNT(e.seq) AS events,
      MIN(e.seq) AS first_event,MAX(e.seq) AS last_event
      FROM benches b LEFT JOIN events e ON e.bench_id=b.bench_id
      GROUP BY b.bench_id`).all();
    // A generation increment and its event row are one transaction in this specimen.
    const accessByBench = new Map();
    for (const b of benches) {
      const a = JSON.parse(b.access_json);
      accessKey(a); // Reject malformed or out-of-compartment bench metadata.
      accessByBench.set(b.bench_id, a);
      if (!Number.isSafeInteger(b.generation) || b.generation < 0 ||
          b.events !== b.generation ||
          (b.events > 0 && (b.first_event !== 1 || b.last_event !== b.generation)))
        throw new Error('Chronology snapshot generation/event history mismatch');
    }
    // Structural SQLite integrity alone cannot detect malformed or broadened
    // access JSON. Preserve the specimen's compartment contract on return.
    for (const i of db.prepare(`SELECT bench_id,item_id,source_id,access_json,warning_ids_json,active
      FROM items`).iterate()) {
      if (!accessByBench.has(i.bench_id) || (i.active !== 0 && i.active !== 1))
        throw new Error('Chronology snapshot contains invalid locator state');
      validateItem({ itemId: i.item_id, sourceId: i.source_id,
        access: JSON.parse(i.access_json), warningIds: JSON.parse(i.warning_ids_json) },
        accessByBench.get(i.bench_id));
    }
    const orphanEvents = db.prepare(`SELECT COUNT(*) AS n FROM events e LEFT JOIN benches b
      ON b.bench_id=e.bench_id WHERE b.bench_id IS NULL`).get().n;
    if (orphanEvents) throw new Error('Chronology snapshot contains orphaned events');
    // A structurally valid database can still contain a contradictory receipt
    // graph. Check clear/restore acts and final active flags, not only row counts.
    auditChronologyV1(db);
    return {
      benchCount: benches.length,
      eventCount: benches.reduce((n, b) => n + b.events, 0)
    };
  } finally { db.close(); }
}

async function refuseStaleSidecars(path) {
  for (const suffix of ['-wal', '-shm']) {
    try { await stat(path + suffix); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    throw new Error('Destination has stale SQLite sidecar: ' + suffix);
  }
}

function temporaryNear(path) {
  return join(dirname(path), '.workbench-snapshot-' + randomUUID() + '.sqlite');
}

// SQLite's online-backup API reads a consistent committed snapshot, including WAL pages.
// Installing via hard link refuses to replace a pre-existing snapshot file.
export async function exportChronologyV1Snapshot(store, targetPath) {
  if (!(store instanceof ChronologyV1BenchStore) ||
      !store.db || store.db.isOpen !== true || store.db.isTransaction ||
      store.db.prepare('PRAGMA user_version').get().user_version !== 1)
    throw new Error('Requires an open, idle chronology v1 Workbench store');
  await mkdir(dirname(targetPath), { recursive: true, mode: 0o700 });
  await refuseStaleSidecars(targetPath);
  const temp = temporaryNear(targetPath);
  try {
    const reserved = await open(temp, 'wx', 0o600);
    await reserved.close();
    await backup(store.db, temp);
    const counts = inspectChronologySnapshot(temp);
    const hash = await fingerprint(temp);
    const manifest = parseManifest({ schema: BENCH_CHRONOLOGY_V1_SNAPSHOT_SCHEMA, format: 'sqlite3', ...hash, ...counts });
    await link(temp, targetPath); // EEXIST is a refusal, never a clobber.
    return manifest;
  } finally { await rm(temp, { force: true }); }
}

// Only a verified, *empty* destination path may receive the snapshot.
// Copy-before-verify prevents an attacker or damaged transfer from changing the source
// between a preflight hash and installation. The source itself is never moved.
export async function importChronologyV1Snapshot(sourcePath, targetPath, rawManifest) {
  const expected = parseManifest(rawManifest);
  await mkdir(dirname(targetPath), { recursive: true, mode: 0o700 });
  await refuseStaleSidecars(targetPath);
  const temp = temporaryNear(targetPath);
  let bytes = 0;
  const hash = createHash('sha256');
  const inspect = new Transform({ transform(chunk, encoding, done) {
    bytes += chunk.length;
    if (!Number.isSafeInteger(bytes)) return done(new Error('Snapshot too large to count safely'));
    hash.update(chunk);
    done(null, chunk);
  }});
  try {
    await pipeline(createReadStream(sourcePath, { highWaterMark: 64 * 1024 }), inspect,
      createWriteStream(temp, { flags: 'wx', mode: 0o600 }));
    if (bytes !== expected.bytes || hash.digest('hex') !== expected.sha256)
      throw new Error('Snapshot bytes/hash mismatch');
    const counts = inspectChronologySnapshot(temp);
    if (counts.benchCount !== expected.benchCount || counts.eventCount !== expected.eventCount)
      throw new Error('Snapshot count/manifest mismatch');
    await link(temp, targetPath); // Refuse replacing an active or previous restore.
    return { ...expected };
  } finally { await rm(temp, { force: true }); }
}
