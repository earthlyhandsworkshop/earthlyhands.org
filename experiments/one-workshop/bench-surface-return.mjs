// Fictional Old-Growth Workbench surface: tidy and restore locators, not sources.
// No authenticated identity, durable storage, notifications, or real file moves.
export const BENCH_SURFACE_SCHEMA = 'earthlyhands.bench-surface.fixture.v0';
const KINDS = new Set(['public', 'workshop', 'private', 'bello-player']);
const MAX_EVENTS = 2000;
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const id = x => typeof x === 'string' && /^[A-Za-z0-9_.:-]{1,120}$/.test(x);
const uniqueIds = xs => Array.isArray(xs) && xs.length > 0 && xs.length <= 500 &&
  xs.every(id) && new Set(xs).size === xs.length;
function requireId(x, label) { if (!id(x)) throw new Error('Invalid ' + label); }
function access(a) {
  if (!object(a) || !KINDS.has(a.kind)) throw new Error('Invalid bench access');
  if (a.kind === 'private') requireId(a.ownerId, 'private owner');
  if (a.kind === 'bello-player') {
    requireId(a.ownerId, 'Bello player'); requireId(a.matchId, 'Bello match');
  }
  if (['public', 'workshop'].includes(a.kind) && (a.ownerId !== undefined || a.matchId !== undefined))
    throw new Error('Unexpected owner or match');
  if (a.kind === 'private' && a.matchId !== undefined) throw new Error('Unexpected private match');
}
function canView(a, viewer) {
  if (!object(viewer) || viewer.authenticated !== true) return false;
  if (a.kind === 'public' || a.kind === 'workshop') return viewer.workshopMember === true;
  if (a.kind === 'private') return viewer.principalId === a.ownerId;
  return viewer.principalId === a.ownerId && viewer.matchId === a.matchId;
}
function canTidy(a, actor) {
  // Simulated identity fixture. Real server must independently authenticate
  // and authorize the actor, not trust these booleans or strings.
  return canView(a, actor) && actor.workshopMember === true;
}
function validateItem(item) {
  if (!object(item)) throw new Error('Invalid bench item');
  requireId(item.itemId, 'item ID');
  requireId(item.sourceId, 'source pointer');
  if (item.warningIds !== undefined &&
      (!Array.isArray(item.warningIds) || item.warningIds.length > 40 ||
       !item.warningIds.every(id) || new Set(item.warningIds).size !== item.warningIds.length))
    throw new Error('Invalid warning jacket pointers');
}
export function emptyBenchSurface(benchId, benchAccess) {
  requireId(benchId, 'bench ID');
  access(benchAccess);
  return { schema: BENCH_SURFACE_SCHEMA, benchId, access: structuredClone(benchAccess),
    generation: 0, events: [] };
}
function replay(ledger) {
  if (!object(ledger) || ledger.schema !== BENCH_SURFACE_SCHEMA ||
      !id(ledger.benchId) || !Number.isSafeInteger(ledger.generation) ||
      ledger.generation < 0 || !Array.isArray(ledger.events) ||
      ledger.generation !== ledger.events.length || ledger.events.length > MAX_EVENTS)
    throw new Error('Invalid bench surface');
  access(ledger.access);
  const active = new Map(), known = new Set(), batches = new Map(), trace = [];
  const eventIds = new Set();
  for (const e of ledger.events) {
    if (!object(e)) throw new Error('Invalid bench event');
    requireId(e.eventId, 'event ID'); requireId(e.by, 'actor');
    if (eventIds.has(e.eventId)) throw new Error('Duplicate event ID');
    eventIds.add(e.eventId);
    if (e.kind === 'place') {
      validateItem(e.item);
      if (known.has(e.item.itemId)) throw new Error('Duplicate item identity');
      known.add(e.item.itemId);
      active.set(e.item.itemId, structuredClone(e.item));
      trace.push({ eventId: e.eventId, kind: 'place', by: e.by, itemIds: [e.item.itemId] });
    } else if (e.kind === 'clear') {
      requireId(e.batchId, 'clearing batch ID');
      if (batches.has(e.batchId)) throw new Error('Duplicate clearing batch');
      if (!uniqueIds(e.itemIds) || e.itemIds.length !== active.size ||
          e.itemIds.some(x => !active.has(x)))
        throw new Error('Clear must name exactly the current bench items');
      const snapshot = e.itemIds.map(x => structuredClone(active.get(x)));
      for (const x of e.itemIds) active.delete(x);
      batches.set(e.batchId, { batchId: e.batchId, by: e.by,
        items: snapshot, restored: false, restoreBy: null });
      trace.push({ eventId: e.eventId, kind: 'clear', by: e.by,
        batchId: e.batchId, itemIds: [...e.itemIds] });
    } else if (e.kind === 'restore') {
      requireId(e.batchId, 'restored batch ID');
      const batch = batches.get(e.batchId);
      if (!batch || batch.restored) throw new Error('Unknown or already restored batch');
      if (batch.items.some(x => active.has(x.itemId)))
        throw new Error('Restore would replace a current bench item');
      for (const item of batch.items) active.set(item.itemId, structuredClone(item));
      batch.restored = true;
      batch.restoreBy = e.by;
      trace.push({ eventId: e.eventId, kind: 'restore', by: e.by,
        batchId: e.batchId, itemIds: batch.items.map(x => x.itemId) });
    } else {
      throw new Error('Unknown bench event kind');
    }
  }
  return { active, batches, trace };
}
// Logical in-memory compare-and-swap only; not an atomic multi-user database.
export function appendBenchSurfaceEvent(ledger, event, expectedGeneration, actor) {
  const state = replay(ledger);
  if (expectedGeneration !== ledger.generation) throw new Error('Stale bench generation');
  if (!canTidy(ledger.access, actor) || !id(actor.principalId) ||
      !object(event) || event.by !== actor.principalId)
    throw new Error('Tidy permission not established');
  if (ledger.events.length >= MAX_EVENTS) throw new Error('Bench event limit');
  const candidate = structuredClone({ ...ledger, generation: ledger.generation + 1,
    events: [...ledger.events, event] });
  replay(candidate);
  return candidate;
}
// Unauthorized callers receive the same null for any private bench state.
// No global generation, hidden count, or real notification is exposed.
export function readBenchSurface(ledger, viewer) {
  const state = replay(ledger);
  if (!canView(ledger.access, viewer)) return null;
  const batches = [...state.batches.values()].map(b => ({
    batchId: b.batchId, clearedBy: b.by, itemIds: b.items.map(x => x.itemId),
    restored: b.restored, restoredBy: b.restoreBy,
    restorable: !b.restored
  }));
  const notices = state.trace.filter(t => t.kind === 'clear' || t.kind === 'restore')
    .map(t => ({ eventId: t.eventId, kind: t.kind, by: t.by,
      batchId: t.batchId, itemCount: t.itemIds.length, delivery: 'not-sent' }));
  return {
    benchId: ledger.benchId,
    activeItems: [...state.active.values()].map(x => structuredClone(x)),
    batches, trace: structuredClone(state.trace),
    notificationSuggestions: notices
  };
}
