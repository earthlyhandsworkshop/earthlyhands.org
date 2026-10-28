// One Workshop: reversible export/import of ONE fictional document and its
// independently verified, content-addressed binary companions.
// No authority, archival provenance, authentication, or public publishing is
// conveyed by this portable envelope. Not production migration machinery.
import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { parseDocument, exportDocument } from './model.mjs';
import { exportBlobManifest, importBlobManifest, parseBlobManifest } from './blob-transfer.mjs';

export const BUNDLE_SCHEMA = 'earthlyhands.one-workshop.portable-bundle.v0';
const MAX_DOCUMENT_BYTES = 110 * 1024 * 1024; // the fictional model has bounded history

function documentFingerprint(text) {
  if (typeof text !== 'string') throw new Error('Document export must be UTF-8 text');
  const bytes = Buffer.byteLength(text, 'utf8');
  if (bytes < 1 || bytes > MAX_DOCUMENT_BYTES) throw new Error('Document export size refused');
  return { bytes, sha256: createHash('sha256').update(text, 'utf8').digest('hex') };
}

export function parseBundleManifest(raw) {
  const x = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!x || typeof x !== 'object' || Array.isArray(x) ||
      Object.keys(x).sort().join(',') !== 'blobs,document,schema' ||
      x.schema !== BUNDLE_SCHEMA || !x.document ||
      typeof x.document !== 'object' || Array.isArray(x.document) ||
      Object.keys(x.document).sort().join(',') !== 'bytes,encoding,sha256' ||
      x.document.encoding !== 'utf8-json' ||
      !Number.isSafeInteger(x.document.bytes) || x.document.bytes < 1 ||
      x.document.bytes > MAX_DOCUMENT_BYTES ||
      typeof x.document.sha256 !== 'string' ||
      !/^[a-f0-9]{64}$/.test(x.document.sha256)) {
    throw new Error('Invalid portable bundle manifest');
  }
  return {
    schema: BUNDLE_SCHEMA,
    document: { encoding: 'utf8-json', bytes: x.document.bytes, sha256: x.document.sha256 },
    blobs: parseBlobManifest(x.blobs)
  };
}

export async function exportPortableBundle(sourceStore, sourceObjectRoot, claimedObjects) {
  // One authoritative row read provides a consistent draft + pinned release.
  // Binary companions are independently verified, never automatically public.
  const documentText = exportDocument(sourceStore.readWorking().document);
  const fingerprint = documentFingerprint(documentText);
  const blobs = await exportBlobManifest(sourceObjectRoot, claimedObjects);
  return {
    manifest: parseBundleManifest({
      schema: BUNDLE_SCHEMA,
      document: { encoding: 'utf8-json', ...fingerprint },
      blobs
    }),
    documentText
  };
}

export async function importPortableBundle(
  destinationStore, sourceObjectRoot, destinationObjectRoot, rawManifest, documentText
) {
  const manifest = parseBundleManifest(rawManifest);
  // The content hash guards exact transfer, not truth or authorized origin.
  const fingerprint = documentFingerprint(documentText);
  if (fingerprint.bytes !== manifest.document.bytes ||
      fingerprint.sha256 !== manifest.document.sha256) {
    throw new Error('Document bytes disagree with portable manifest');
  }
  parseDocument(documentText); // validate history and release before touching destination

  // A live Workshop is not a replacement target. Recheck via transactional
  // restore at the final crossing to reject competing writes.
  if (destinationStore.readWorking().generation !== 1 || destinationStore.readPublic() !== null) {
    throw new Error('Portable import refused: destination has live work');
  }
  // Import preflights every source binary before copying. It may leave complete,
  // verified orphan objects if a later operation fails; metadata stays unchanged.
  await importBlobManifest(sourceObjectRoot, destinationObjectRoot, manifest.blobs);
  const restored = destinationStore.restore(documentText, 1);
  return { manifest, generation: restored.generation };
}
