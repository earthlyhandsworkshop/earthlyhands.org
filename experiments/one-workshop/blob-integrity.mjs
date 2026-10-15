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
