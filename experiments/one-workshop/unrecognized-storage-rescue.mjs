// A download-only rescue envelope for browser localStorage text that failed
// validation. localStorage supplies a JavaScript string, NOT original source
// bytes. JSON.stringify escapes isolated UTF-16 surrogates, which Blob would
// silently replace if given the unwrapped string.
export const UNRECOGNIZED_STORAGE_RESCUE_SCHEMA =
  'earthlyhands.one-workshop.unrecognized-storage-rescue.v1';

export function exportUnrecognizedStoredString(storedString, storageKey) {
  if (typeof storedString !== 'string') {
    throw new TypeError('Unrecognized stored value must be a JavaScript string');
  }
  if (typeof storageKey !== 'string' || !storageKey) {
    throw new TypeError('A nonempty browser storage key is required');
  }
  // JSON is a carrier, not a claim that the damaged value is valid journal JSON.
  // Parsing this envelope recovers the original JavaScript string exactly,
  // including lone surrogates; it does not authenticate or repair anything.
  return JSON.stringify({
    schema: UNRECOGNIZED_STORAGE_RESCUE_SCHEMA,
    storage_key: storageKey,
    stored_string: storedString,
  }, null, 2) + '\n';
}
