// A portable private backpack specimen, independent of any AI provider.
// Pure model only: no authentication, storage, networking, or publication.
export const VERSION = 'earthlyhands.backpack.specimen.v0';
// Supports every canonical export admitted by this model, including escaped notes.
// This is a file-import ceiling, not a promise of browser storage capacity.
export const MAX_BACKPACK_IMPORT_BYTES = 8_000_000;
const LIMIT = 100;
export function newBackpack(owner) {
  if (typeof owner !== 'string' || !owner.trim() || owner.length > 128) throw Error('Invalid owner');
  return {schema: VERSION, owner, entries: []};
}
export function parseBackpack(raw) {
  const x = typeof raw === 'string' ? JSON.parse(raw) : raw;
  // Unknown fields may be a later carrier's history, provenance, or custody.
  // Refuse them rather than silently erase them during import/export.
  if (!x || typeof x !== 'object' || Array.isArray(x) ||
      Object.keys(x).sort().join(',') !== 'entries,owner,schema')
    throw Error('Unrecognized backpack fields; original import must be kept');
  if (x.schema !== VERSION || typeof x.owner !== 'string' || !x.owner.trim() ||
    x.owner.length > 128 || !Array.isArray(x.entries) || x.entries.length > LIMIT) throw Error('Invalid backpack');
  const seen = new Set();
  for (const e of x.entries) {
    if (!e || typeof e !== 'object' || Array.isArray(e) ||
        Object.keys(e).sort().join(',') !== 'document_id,note,source_revision')
      throw Error('Unrecognized annotation fields; original import must be kept');
    if (typeof e.document_id !== 'string' || !/^[a-zA-Z0-9:._-]{1,120}$/.test(e.document_id) ||
        !Number.isSafeInteger(e.source_revision) || e.source_revision < 1 ||
        typeof e.note !== 'string' || e.note.length > 10000 || seen.has(e.document_id)) throw Error('Invalid entry');
    seen.add(e.document_id);
  }
  return {schema: VERSION,owner:x.owner,entries:x.entries.map(e=>({
    document_id:e.document_id,source_revision:e.source_revision,note:e.note
  }))};
}
export function putNote(backpack, document_id, source_revision, note) {
  const x = parseBackpack(backpack);
  const entry = {document_id,source_revision,note};
  const pos=x.entries.findIndex(e=>e.document_id===document_id);
  if(pos>=0) x.entries[pos]=entry; else x.entries.push(entry);
  return parseBackpack(x);
}
export function removeNote(backpack,document_id) {
  const x=parseBackpack(backpack);
  x.entries=x.entries.filter(e=>e.document_id!==document_id);
  return x;
}
// Receiving is additive. A conflicting history must be reconciled by the visitor,
// never silently replaced by an imported specimen. Owner is an unauthenticated label.
export function receiveBackpack(current, incoming) {
  const local=parseBackpack(current);
  const arrival=parseBackpack(incoming);
  if(local.entries.length===0) return arrival; // restore a carried bag on an empty device
  if(local.owner!==arrival.owner) throw Error('Different visitor labels; keep both copies for reconciliation');
  const entries=local.entries.slice();
  const byId=new Map(entries.map(entry=>[entry.document_id,entry]));
  for(const entry of arrival.entries) {
    const present=byId.get(entry.document_id);
    if(present) {
      if(present.source_revision!==entry.source_revision || present.note!==entry.note)
        throw Error('Conflicting annotation; keep both copies for reconciliation');
    } else {
      entries.push(entry);
      byId.set(entry.document_id,entry);
    }
  }
  return parseBackpack({schema:VERSION,owner:local.owner,entries}); // capacity gate
}
export function exportBackpack(backpack) {return JSON.stringify(parseBackpack(backpack),null,2)+'\n';}
