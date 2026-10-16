// Carry a Public Lands personal folio without silently converting its own schema.
// Fictional/visitor-generated notes only. No upload, authentication, or encryption.
export const CAPSULE_SCHEMA = 'earthlyhands.native-folio-pocket.v0';
export const PL111_SOURCE = 'public-lands-return-3-face-111';
const PL111_FORMAT = 'Earthly Hands / Public Lands / folio v1';
const MAX_BYTES = 300_000;

function readNative(raw) {
  if (typeof raw !== 'string' || new TextEncoder().encode(raw).length > MAX_BYTES) {
    throw Error('Not a supported folio JSON file');
  }
  const x = JSON.parse(raw);
  if (!x || Array.isArray(x) || x.v !== 1 || x.source !== PL111_SOURCE ||
      x.format !== PL111_FORMAT || typeof x.workingReadingEdition !== 'string' ||
      !x.workingReadingEdition || x.workingReadingEdition.length > 120 ||
      typeof x.note !== 'string' || x.note.length > 5000 ||
      !Array.isArray(x.occurrences) || x.occurrences.length > 40 ||
      !Array.isArray(x.marks) || x.marks.length > 120) {
    throw Error('Not an exported Public Lands page-111 folio');
  }
  return x;
}

// The native folio is carried as an opaque body. Its own source page judges
// whether its marks still apply to a later working edition.
export function carryNativeFolio(raw) {
  const x = readNative(raw);
  return {schema: CAPSULE_SCHEMA, source: PL111_SOURCE,
    working_edition: x.workingReadingEdition, raw_json: raw};
}

export function checkNativeFolioPocket(value) {
  const x = typeof value === 'string' ? JSON.parse(value) : value;
  if (!x || Array.isArray(x) || x.schema !== CAPSULE_SCHEMA ||
      x.source !== PL111_SOURCE || typeof x.working_edition !== 'string') {
    throw Error('Invalid native-folio pocket');
  }
  const source = readNative(x.raw_json);
  if (x.working_edition !== source.workingReadingEdition) {
    throw Error('Edition reference differs from carried folio');
  }
  return {schema: CAPSULE_SCHEMA, source: PL111_SOURCE,
    working_edition: source.workingReadingEdition, raw_json: x.raw_json};
}

export function recoverNativeFolio(value) {
  return checkNativeFolioPocket(value).raw_json;
}
