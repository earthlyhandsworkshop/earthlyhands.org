// A portable private backpack specimen, independent of any AI provider.
// Pure model only: no authentication, storage, networking, or publication.
export const VERSION = 'earthlyhands.backpack.specimen.v0';
const LIMIT = 100;
export function newBackpack(owner) {
  if (typeof owner !== 'string' || !owner.trim() || owner.length > 128) throw Error('Invalid owner');
  return {schema: VERSION, owner, entries: []};
}
export function parseBackpack(raw) {
  const x = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!x || x.schema !== VERSION || typeof x.owner !== 'string' || !x.owner.trim() ||
    x.owner.length > 128 || !Array.isArray(x.entries) || x.entries.length > LIMIT) throw Error('Invalid backpack');
  const seen = new Set();
  for (const e of x.entries) {
    if (!e || typeof e.document_id !== 'string' || !/^[a-zA-Z0-9:._-]{1,120}$/.test(e.document_id) ||
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
export function exportBackpack(backpack) {return JSON.stringify(parseBackpack(backpack),null,2)+'\n';}
