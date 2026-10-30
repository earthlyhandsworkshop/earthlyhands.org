// Experimental portable binary handoff for the fictional One Workshop store.
// A manifest preserves byte identity, not provenance, rights, or publication authority.
import { join } from 'node:path';
import { parseFingerprint, verifyBlob, receiveVerifiedBlob } from './blob-integrity.mjs';

export const MANIFEST_SCHEMA = 'earthlyhands.one-workshop.blob-manifest.v0';
const MAX_ITEMS = 100_000;

export function parseBlobManifest(raw) {
  const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).sort().join(',') !== 'objects,schema' ||
      value.schema !== MANIFEST_SCHEMA || !Array.isArray(value.objects) ||
      value.objects.length > MAX_ITEMS) throw new Error('Invalid blob manifest');
  const seen = new Set();
  const objects = value.objects.map(item => {
    const record = parseFingerprint(item);
    if (seen.has(record.sha256)) throw new Error('Duplicate object in blob manifest');
    seen.add(record.sha256);
    return record;
  });
  return { schema: MANIFEST_SCHEMA, objects: objects.sort((a, b) => a.sha256.localeCompare(b.sha256)) };
}

export async function exportBlobManifest(root, claimedObjects) {
  if (!Array.isArray(claimedObjects) || claimedObjects.length > MAX_ITEMS) {
    throw new Error('Invalid object claims');
  }
  const manifest = parseBlobManifest({ schema: MANIFEST_SCHEMA, objects: claimedObjects });
  for (const object of manifest.objects) {
    await verifyBlob(join(root, object.object_key), object);
  }
  return manifest;
}

export async function importBlobManifest(sourceRoot, destinationRoot, rawManifest) {
  const manifest = parseBlobManifest(rawManifest);
  // Preflight the entire source set before placing any object at destination.
  // A failure during copying can still leave verified objects behind; metadata
  // and any public release must be committed separately by an authorized hand.
  for (const object of manifest.objects) {
    await verifyBlob(join(sourceRoot, object.object_key), object);
  }
  for (const object of manifest.objects) {
    await receiveVerifiedBlob(join(sourceRoot, object.object_key), destinationRoot, object);
  }
  return manifest;
}
