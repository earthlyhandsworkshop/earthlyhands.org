// One Workshop / Small Door: isolated, entirely fictional selective return.
// This is a PURE IN-MEMORY MODEL, not an access-control service, database,
// source verifier, publication route, identity check, or deployed interface.
// Server adapters must enforce permissions and atomic writes independently.
export const WANDER_SCHEMA = 'earthlyhands.wandering.fixture.v0';
export const SHARED_SCHEMA = 'earthlyhands.wandering-shared.fixture.v0';
const MAX_ENTRIES = 200;
const MAX_EVENTS = 1000;
const id = x => typeof x === 'string' && /^[A-Za-z0-9_.:-]{1,100}$/.test(x);
const text = x => typeof x === 'string' && x.trim().length > 0 && x.length <= 2000;
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const BASIS_KIND = new Set(['source', 'original']);
const SOURCE_ACCESS = new Set(['public', 'workshop', 'private']);
const ENTRY_KIND = new Set(['question', 'reading', 'speculation', 'experiment']);
const exact = (x, keys) => object(x) && Reflect.ownKeys(x).length === keys.length &&
  keys.every(k => Object.hasOwn(x, k));
function requireId(value, name) { if (!id(value)) throw new Error('Invalid ' + name); }
function requireText(value, name) { if (!text(value)) throw new Error('Invalid ' + name); }
function validateEntry(e) {
  if (!exact(e, ['entryId','kind','words','basisKind','basisId','basisAccess'])) throw new Error('Invalid entry envelope');
  requireId(e.entryId, 'entry ID');
  if (!ENTRY_KIND.has(e.kind)) throw new Error('Invalid tentative kind');
  requireText(e.words, 'words');
  if (!BASIS_KIND.has(e.basisKind)) throw new Error('Invalid basis kind');
  requireId(e.basisId, 'basis ID');
  if (!SOURCE_ACCESS.has(e.basisAccess)) throw new Error('Unknown basis access');
}
function validateWander(w) {
  if (!exact(w, ['schema','wanderId','hand','entries']) || w.schema !== WANDER_SCHEMA ||
    !Array.isArray(w.entries) || w.entries.length > MAX_ENTRIES) throw new Error('Invalid wandering body');
  requireId(w.wanderId, 'wandering ID'); requireId(w.hand, 'hand');
  const seen = new Set();
  for (const e of w.entries) {
    validateEntry(e);
    if (seen.has(e.entryId)) throw new Error('Duplicate wandering entry');
    seen.add(e.entryId);
  }
}
export function beginWander(wanderId, hand) {
  const w = {schema:WANDER_SCHEMA,wanderId,hand,entries:[]};
  validateWander(w);
  return w;
}
export function noteWander(wander, entry) {
  validateWander(wander); validateEntry(entry);
  if (wander.entries.length >= MAX_ENTRIES) throw new Error('Wandering capacity exceeded');
  const next = structuredClone({...wander, entries:[...wander.entries,entry]});
  validateWander(next);
  return next;
}
export function emptyShared() { return {schema:SHARED_SCHEMA,generation:0,events:[]}; }
function replay(shared) {
  if (!exact(shared, ['schema','generation','events']) || shared.schema !== SHARED_SCHEMA ||
      !Number.isSafeInteger(shared.generation) || !Array.isArray(shared.events) ||
      shared.generation !== shared.events.length || shared.events.length > MAX_EVENTS)
    throw new Error('Invalid shared body');
  const current = new Map(), used = new Set();
  for (const e of shared.events) {
    if (!object(e)) throw new Error('Invalid shared event');
    requireId(e.eventId, 'event ID'); requireId(e.by, 'attributed hand');
    if (used.has(e.eventId)) throw new Error('Duplicate shared event');
    used.add(e.eventId);
    if (e.kind === 'return') {
      if (!exact(e, ['eventId','kind','by','itemId','wanderId','entryId','basisKind','basisId','basisAccess','entryKind','words','standing','visibility']))
        throw new Error('Invalid return event');
      requireId(e.itemId, 'item ID'); requireId(e.wanderId, 'wander ID');
      requireId(e.entryId, 'entry ID'); requireId(e.basisId, 'basis ID');
      requireText(e.words, 'returned words');
      if (!ENTRY_KIND.has(e.entryKind) || !BASIS_KIND.has(e.basisKind) ||
          !['public','workshop'].includes(e.basisAccess) ||
          e.standing !== 'proposed' || e.visibility !== 'workshop' ||
          e.itemId !== (e.wanderId + ':' + e.entryId) || current.has(e.itemId))
        throw new Error('Invalid selective return');
      current.set(e.itemId, {...e});
    } else if (e.kind === 'revise') {
      if (!exact(e, ['eventId','kind','by','itemId','words','reason','basisKind','basisId','basisAccess']))
        throw new Error('Invalid revision event');
      requireId(e.itemId, 'item ID'); requireText(e.words, 'revision words');
      requireText(e.reason, 'revision reason'); requireId(e.basisId, 'revision basis');
      if (!BASIS_KIND.has(e.basisKind) || !['public','workshop'].includes(e.basisAccess) ||
          !current.has(e.itemId) || current.get(e.itemId).standing === 'withdrawn')
        throw new Error('Cannot revise missing/withdrawn item or restricted source');
      current.set(e.itemId, {...current.get(e.itemId), words:e.words,
        basisKind:e.basisKind,basisId:e.basisId,basisAccess:e.basisAccess,lastBy:e.by});
    } else if (e.kind === 'withdraw') {
      if (!exact(e, ['eventId','kind','by','itemId','reason','notice']))
        throw new Error('Invalid withdrawal event');
      requireId(e.itemId, 'item ID'); requireText(e.reason, 'withdrawal reason');
      requireText(e.notice, 'withdrawal notice');
      if (!current.has(e.itemId) || current.get(e.itemId).standing === 'withdrawn')
        throw new Error('Cannot withdraw missing/already withdrawn item');
      // The notice stays visible to the same authorized Workshop audience.
      current.set(e.itemId, {...current.get(e.itemId),standing:'withdrawn',
        notice:e.notice,lastBy:e.by});
    } else throw new Error('Unknown shared event kind');
  }
  return current;
}
function appendShared(shared, events, expectedGeneration) {
  replay(shared);
  if (shared.generation !== expectedGeneration) throw new Error('Stale shared generation');
  if (!events.length || shared.events.length + events.length > MAX_EVENTS) throw new Error('Invalid return batch');
  const next = structuredClone({schema:SHARED_SCHEMA,
    generation:shared.generation + events.length, events:[...shared.events,...events]});
  replay(next);
  return next;
}
// Selection is explicit: an entire wandering body is never silently imported.
// Nothing here establishes the source's actual rights or the hand's identity.
export function returnSelected(shared, wander, selectedIds, expectedGeneration) {
  validateWander(wander); replay(shared);
  if (!Array.isArray(selectedIds) || selectedIds.length < 1 || selectedIds.length > MAX_ENTRIES ||
      !selectedIds.every(id) || new Set(selectedIds).size !== selectedIds.length)
    throw new Error('Invalid chosen set');
  const entries = new Map(wander.entries.map(e=>[e.entryId,e]));
  const batch = selectedIds.map(entryId=>{
    const entry = entries.get(entryId);
    if (!entry) throw new Error('Selected entry not in wandering body');
    // An unverified private source is NOT made shared by its author's wish.
    if (entry.basisAccess === 'private') throw new Error('Private basis cannot cross');
    return {eventId:'return:' + wander.wanderId + ':' + entryId,kind:'return',
      by:wander.hand,itemId:wander.wanderId + ':' + entryId,
      wanderId:wander.wanderId,entryId,basisKind:entry.basisKind,
      basisId:entry.basisId,basisAccess:entry.basisAccess,entryKind:entry.kind,words:entry.words,
      standing:'proposed',visibility:'workshop'};
  });
  return appendShared(shared,batch,expectedGeneration);
}
// Correction and withdrawal add history: they never replace old event bytes.
export function addSharedChange(shared, change, expectedGeneration) {
  return appendShared(shared,[change],expectedGeneration);
}
export function readShared(shared, audience) {
  const current = replay(shared);
  if (audience !== 'public' && audience !== 'workshop') throw new Error('Invalid audience');
  if (audience === 'public') return []; // No publication door in this specimen.
  return [...current.values()].map(x=>{
    const item={itemId:x.itemId,attributedHand:x.by,lastActBy:x.lastBy ?? x.by,
      basisKind:x.basisKind,basisId:x.basisId,entryKind:x.entryKind,
      standing:x.standing,visibility:x.visibility};
    if (x.standing === 'withdrawn') item.notice=x.notice;
    else item.words=x.words;
    return item;
  }).sort((a,b)=>a.itemId.localeCompare(b.itemId));
}
// Internal audit only: a real adapter MUST independently authorize access.
export function historyFor(shared,itemId) {
  replay(shared); requireId(itemId,'history item');
  return structuredClone(shared.events.filter(e=>e.itemId===itemId));
}
