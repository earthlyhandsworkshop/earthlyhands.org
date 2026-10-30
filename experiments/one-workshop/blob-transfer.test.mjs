import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fingerprintBlob, verifyBlob, receiveVerifiedBlob } from './blob-integrity.mjs';
import { exportBlobManifest, importBlobManifest, parseBlobManifest, MANIFEST_SCHEMA } from './blob-transfer.mjs';

test('portable manifest reproduces independently checked binary material', async t => {
  const home = mkdtempSync(join(tmpdir(), 'one-workshop-transfer-'));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const original = join(home, 'synthetic');
  const from = join(home, 'from'), to = join(home, 'to');
  writeFileSync(original, Buffer.alloc(2 * 1024 * 1024, 0x42));
  const record = await fingerprintBlob(original);
  await receiveVerifiedBlob(original, from, record);
  const manifest = await exportBlobManifest(from, [record]);
  assert.equal(manifest.schema, MANIFEST_SCHEMA);
  assert.deepEqual(await importBlobManifest(from, to, JSON.stringify(manifest)), manifest);
  assert.deepEqual(await verifyBlob(join(to, record.object_key), record), record);
  assert.deepEqual(await importBlobManifest(from, to, manifest), manifest);
  assert.throws(() => parseBlobManifest({schema:MANIFEST_SCHEMA,objects:[record,record]}), /Duplicate/);
});

test('changed source refuses transfer before creating destination', async t => {
  const home = mkdtempSync(join(tmpdir(), 'one-workshop-transfer-check-'));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const original = join(home, 'synthetic');
  const from = join(home, 'from'), to = join(home, 'to');
  writeFileSync(original, Buffer.alloc(1024, 0x42));
  const record = await fingerprintBlob(original);
  await receiveVerifiedBlob(original, from, record);
  const manifest = await exportBlobManifest(from, [record]);
  writeFileSync(join(from, record.object_key), Buffer.alloc(1024, 0x43));
  await assert.rejects(importBlobManifest(from, to, manifest), /integrity mismatch/);
  assert.equal(existsSync(to), false);
});
