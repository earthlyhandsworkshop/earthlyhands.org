// A deliberately small, portable state model for a fictional document.
// This is NOT a multi-user datastore, authentication layer, or server-side CAS.
export const SCHEMA = 'earthlyhands.one-workshop.demo.v0';
export const DOCUMENT_ID = 'eh:test:0001';
export const INITIAL_TEXT = '# A sheet on the workbench\n\nA visitor enters the Workshop, finds a sheet, and leaves a question beside it.';
const MAX_REVISIONS = 1000;
const MAX_CONTENT_LENGTH = 100_000;
// A v0 parser must not silently erase future provenance, permission, or
// revision metadata when it normalizes an imported record.
const hasExactFields = (value, fields) => value && typeof value === 'object' &&
  !Array.isArray(value) && Object.keys(value).sort().join(',') === fields;

export function newDocument() {
  return {
    schema: SCHEMA,
    id: DOCUMENT_ID,
    kind: 'fictional-test',
    history: [{ revision: 1, content: INITIAL_TEXT }],
    working_revision: 1,
    publication: null
  };
}

export function parseDocument(value) {
  const x = typeof value === 'string' ? JSON.parse(value) : value;
  if (!x || typeof x !== 'object' || Array.isArray(x) ||
      x.schema !== SCHEMA || x.id !== DOCUMENT_ID || x.kind !== 'fictional-test') {
    throw new Error('Incorrect schema or document identity');
  }
  if (!hasExactFields(x, 'history,id,kind,publication,schema,working_revision'))
    throw new Error('Unrecognized document fields; retain the original carrier');
  const h = x.history;
  if (!Array.isArray(h) || h.length < 1 || h.length > MAX_REVISIONS ||
      !h.every((r, i) => hasExactFields(r, 'content,revision') && r.revision === i + 1 &&
        typeof r.content === 'string' && r.content.length <= MAX_CONTENT_LENGTH) ||
      x.working_revision !== h.length) {
    throw new Error('Invalid revision history');
  }
  const p = x.publication;
  if (p !== null && (!hasExactFields(p, 'content,revision') || !Number.isSafeInteger(p.revision) ||
      p.revision < 1 || p.revision > h.length ||
      typeof p.content !== 'string' || p.content !== h[p.revision - 1].content)) {
    throw new Error('Public release does not match its recorded revision');
  }
  // Return a fresh normalized object; never put imported objects into the live state by reference.
  return {
    schema: SCHEMA, id: DOCUMENT_ID, kind: 'fictional-test',
    history: h.map(r => ({ revision: r.revision, content: r.content })),
    working_revision: h.length,
    publication: p === null ? null : { revision: p.revision, content: p.content }
  };
}

export function saveRevision(document, content, expectedRevision) {
  const current = parseDocument(document);
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision !== current.working_revision) {
    throw new Error('Stale revision. Reload before saving; changes were not overwritten.');
  }
  if (typeof content !== 'string' || content.length > MAX_CONTENT_LENGTH) {
    throw new Error('Invalid or oversized document text');
  }
  if (content === current.history.at(-1).content) return current;
  if (current.history.length === MAX_REVISIONS) throw new Error('Revision limit reached in this demonstration');
  const next = current.working_revision + 1;
  current.history.push({ revision: next, content });
  current.working_revision = next;
  return current;
}

export function approveRevision(document, expectedRevision) {
  const current = parseDocument(document);
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision !== current.working_revision) {
    throw new Error('Stale revision. Approval refused.');
  }
  current.publication = { ...current.history.at(-1) };
  return current;
}

export function publicText(document) {
  return parseDocument(document).publication?.content ?? null;
}

export function exportDocument(document) {
  return JSON.stringify(parseDocument(document), null, 2) + '\n';
}
