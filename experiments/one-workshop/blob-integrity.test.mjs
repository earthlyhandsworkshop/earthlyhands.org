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
