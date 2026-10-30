import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, openSync, writeSync, closeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fingerprintBlob, verifyBlob } from './blob-integrity.mjs';

test('streaming fingerprint: 32 MiB integrity and changed-byte detection', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'one-workshop-blob-'));
  t.after(() => rmSync(dir, {recursive:true, force:true}));
  const path = join(dir, 'synthetic-binary');
  const fd = openSync(path, 'w');
  const chunk = Buffer.alloc(64 * 1024, 0x42);
  try { for (let i = 0; i < 512; i++) writeSync(fd, chunk); }
  finally { closeSync(fd); }
  const record = await fingerprintBlob(path);
  assert.equal(record.bytes, 32 * 1024 * 1024);
  assert.deepEqual(await verifyBlob(path, record), record);
  const opened = openSync(path, 'r+');
  try { writeSync(opened, Buffer.from([0x41]), 0, 1, 10); }
  finally { closeSync(opened); }
  await assert.rejects(verifyBlob(path, record), /integrity mismatch/);
});

import { writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { receiveVerifiedBlob } from './blob-integrity.mjs';

test('verified receive streams a 32 MiB object without publishing partial or changed bytes', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'one-workshop-receive-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const source = join(dir, 'source');
  const fd = openSync(source, 'w');
  try { for (let i = 0; i < 512; i++) writeSync(fd, Buffer.alloc(64 * 1024, i % 251)); }
  finally { closeSync(fd); }
  const record = await fingerprintBlob(source);
  const root = join(dir, 'store');
  const placed = await receiveVerifiedBlob(source, root, record);
  assert.deepEqual(await verifyBlob(placed.local_path, record), record);
  assert.equal(placed.local_path, join(root, record.object_key));
  const opened = openSync(source, 'r+');
  try { writeSync(opened, Buffer.from([0x01]), 0, 1, 0); }
  finally { closeSync(opened); }
  await assert.rejects(receiveVerifiedBlob(source, root, record), /integrity mismatch/);
  assert.deepEqual(await verifyBlob(placed.local_path, record), record);
  assert.deepEqual(readdirSync(join(root, 'sha256')), [record.sha256]);
});

test('two simultaneous receives reuse a valid object, but never replace a poisoned target', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'one-workshop-race-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const source = join(dir, 'fictional-source');
  writeFileSync(source, Buffer.alloc(4 * 1024 * 1024, 0x71));
  const record = await fingerprintBlob(source);
  const root = join(dir, 'store');
  const [first, second] = await Promise.all([
    receiveVerifiedBlob(source, root, record), receiveVerifiedBlob(source, root, record)
  ]);
  assert.equal(first.local_path, second.local_path);
  assert.deepEqual(readdirSync(join(root, 'sha256')), [record.sha256]);
  assert.deepEqual(await verifyBlob(first.local_path, record), record);
  writeFileSync(first.local_path, 'corrupted existing object');
  await assert.rejects(receiveVerifiedBlob(source, root, record), /integrity mismatch/);
  assert.equal(readFileSync(first.local_path, 'utf8'), 'corrupted existing object');
  assert.deepEqual(readdirSync(join(root, 'sha256')), [record.sha256]);
});
