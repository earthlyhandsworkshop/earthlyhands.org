// Portable, streaming integrity witness for fictional archival-sized binaries.
// A hash is not evidence of source rights, institutional custody, or authenticity.
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';

export const BLOB_SCHEMA = 'earthlyhands.one-workshop.blob.v0';
const CHUNK = 64 * 1024;

export async function fingerprintBlob(path) {
  const hash = createHash('sha256');
  let bytes = 0;
  for await (const part of createReadStream(path, { highWaterMark: CHUNK })) {
    bytes += part.length;
    if (!Number.isSafeInteger(bytes)) throw new Error('Blob is too large to count safely');
    hash.update(part);
  }
  const sha256 = hash.digest('hex');
  return { schema: BLOB_SCHEMA, bytes, sha256, object_key: `sha256/${sha256}` };
}

export function parseFingerprint(value) {
  const x = typeof value === 'string' ? JSON.parse(value) : value;
  if (!x || typeof x !== 'object' || Array.isArray(x) ||
      x.schema !== BLOB_SCHEMA || !Number.isSafeInteger(x.bytes) || x.bytes < 0 ||
      typeof x.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(x.sha256) ||
      x.object_key !== `sha256/${x.sha256}`) {
    throw new Error('Invalid object fingerprint');
  }
  return {schema:BLOB_SCHEMA, bytes:x.bytes, sha256:x.sha256, object_key:x.object_key};
}

export async function verifyBlob(path, recordedFingerprint) {
  const expected = parseFingerprint(recordedFingerprint);
  const actual = await fingerprintBlob(path);
  if (expected.bytes !== actual.bytes || expected.sha256 !== actual.sha256) {
    throw new Error('Blob integrity mismatch');
  }
  return actual;
}

// Import a binary into a local content-addressed test store. The incoming
// fingerprint is a claim to check, never permission or proof of provenance.
// Install only after a full streaming comparison. A hard link makes creation
// atomic and refuses to replace a preexisting object of the same name.
// This is a trusted-local-filesystem experiment, not crash-proof object storage.
import { createWriteStream } from 'node:fs';
import { mkdir, link, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';

export async function receiveVerifiedBlob(sourcePath, directory, claimedFingerprint) {
  const expected = parseFingerprint(claimedFingerprint);
  const folder = join(directory, 'sha256');
  const target = join(folder, expected.sha256);
  const temporary = join(folder, '.incoming-' + randomUUID());
  await mkdir(folder, { recursive: true });
  const hash = createHash('sha256');
  let bytes = 0;
  const check = new Transform({ transform(chunk, encoding, next) {
    bytes += chunk.length;
    if (!Number.isSafeInteger(bytes)) return next(new Error('Blob is too large to count safely'));
    hash.update(chunk);
    next(null, chunk);
  }});
  try {
    await pipeline(createReadStream(sourcePath, { highWaterMark: CHUNK }), check,
      createWriteStream(temporary, { flags: 'wx', mode: 0o600 }));
    if (bytes !== expected.bytes || hash.digest('hex') !== expected.sha256) {
      throw new Error('Blob integrity mismatch during receive');
    }
    try {
      await link(temporary, target);
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      // Reuse only a verified object. Do not replace or repair in place.
      await verifyBlob(target, expected);
    }
    return { ...expected, local_path: target };
  } finally {
    await unlink(temporary).catch(error => {
      if (error.code !== 'ENOENT') throw error;
    });
  }
}
