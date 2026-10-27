// Fictional Workbench warning jacket: NOT authentication, custody, or a truth engine.
export const WARNING_JACKET_SCHEMA = 'earthlyhands.bench-warning-jacket.fixture.v0';
const LIMIT = 1500;
const KINDS = new Set(['public', 'workshop', 'private', 'bello-player']);
const DISPOSITIONS = new Set(['quiet', 'triumphant']);
const obj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const id = x => typeof x === 'string' && /^[A-Za-z0-9_.:-]{1,120}$/.test(x);
const note = x => typeof x === 'string' && x.trim().length > 0 && x.length <= 1200;
function requireId(x, what) { if (!id(x)) throw new Error('Invalid ' + what); }
function requireNote(x, what) { if (!note(x)) throw new Error('Invalid ' + what); }
function access(a) {
  if (!obj(a) || !KINDS.has(a.kind)) throw new Error('Invalid access class');
  if (a.kind === 'private') requireId(a.ownerId, 'private owner');
  if (a.kind === 'bello-player') {
    requireId(a.ownerId, 'Bello player');
    requireId(a.matchId, 'Bello match');
  }
  if ((a.kind === 'public' || a.kind === 'workshop') && (a.ownerId !== undefined || a.matchId !== undefined))
    throw new Error('Unexpected access owner');
  if (a.kind === 'private' && a.matchId !== undefined) throw new Error('Unexpected private match');
}
function key(a) {
  access(a);
  return a.kind + ':' + (a.ownerId ?? '') + ':' + (a.matchId ?? '');
}
function sourceRefs(refs, warningAccess) {
  if (!Array.isArray(refs) || refs.length > 40) throw new Error('Invalid source refs');
  const seen = new Set();
  for (const s of refs) {
    if (!obj(s)) throw new Error('Invalid source reference');
    requireId(s.id, 'source ID');
    access(s.access);
    if (seen.has(s.id)) throw new Error('Duplicate source ID');
    if (s.access.kind !== 'public' && key(s.access) !== key(warningAccess))
      throw new Error('Source access exceeds warning compartment');
    seen.add(s.id);
  }
}
function canRead(a, viewer) {
  // The viewer is a test fixture, never an authenticated identity.
  if (!obj(viewer)) throw new Error('Missing fixture viewer');
  if (a.kind === 'public') return true;
  if (a.kind === 'workshop') return viewer.workshopMember === true;
  if (a.kind === 'private') return viewer.principalId === a.ownerId;
  return viewer.principalId === a.ownerId && viewer.matchId === a.matchId;
}
function sameAccess(a, b) { return key(a) === key(b); }
export function emptyWarningJacket() {
  return { schema: WARNING_JACKET_SCHEMA, generation: 0, events: [] };
}
function replay(ledger) {
  if (!obj(ledger) || ledger.schema !== WARNING_JACKET_SCHEMA ||
      !Number.isSafeInteger(ledger.generation) || ledger.generation < 0 ||
      !Array.isArray(ledger.events) || ledger.events.length !== ledger.generation ||
      ledger.events.length > LIMIT) throw new Error('Invalid warning ledger');
  const ids = new Set(), warnings = new Map(), receipts = [];
  for (const e of ledger.events) {
    if (!obj(e)) throw new Error('Invalid warning event');
    requireId(e.eventId, 'event ID');
    requireId(e.recordedBy, 'recording hand');
    if (ids.has(e.eventId)) throw new Error('Duplicate event ID');
    ids.add(e.eventId);
    if (e.kind === 'warn') {
      requireId(e.warningId, 'warning ID');
      requireId(e.objectId, 'object ID');
      requireId(e.code, 'warning code');
      requireNote(e.explanation, 'warning explanation');
      access(e.access);
      sourceRefs(e.sourceRefs, e.access);
      if (warnings.has(e.warningId)) throw new Error('Duplicate warning ID');
      warnings.set(e.warningId, {
        warningId: e.warningId, objectId: e.objectId, code: e.code,
        explanation: e.explanation, access: e.access, sourceRefs: e.sourceRefs,
        status: 'open', history: [{ kind: 'warn', recordedBy: e.recordedBy }]
      });
    } else if (e.kind === 'acknowledge' || e.kind === 'resolve' || e.kind === 'reopen') {
      requireId(e.warningId, 'warning ID');
      const w = warnings.get(e.warningId);
      if (!w) throw new Error('Unknown warning');
      if (e.kind === 'acknowledge') {
        if (w.status !== 'open') throw new Error('Only open warnings may be acknowledged');
        requireNote(e.note, 'acknowledgement');
        w.status = 'acknowledged';
        w.history.push({ kind: 'acknowledge', recordedBy: e.recordedBy, note: e.note });
      } else if (e.kind === 'resolve') {
        if (w.status === 'resolved') throw new Error('Already resolved');
        requireNote(e.note, 'resolution');
        sourceRefs(e.sourceRefs, w.access);
        w.status = 'resolved';
        w.history.push({ kind: 'resolve', recordedBy: e.recordedBy,
          note: e.note, sourceRefs: e.sourceRefs });
      } else {
        if (w.status !== 'resolved') throw new Error('Only resolved warnings may reopen');
        requireNote(e.note, 'reopening reason');
        sourceRefs(e.sourceRefs, w.access);
        w.status = 'open'; // New question requires new acknowledgement.
        w.history.push({ kind: 'reopen', recordedBy: e.recordedBy,
          note: e.note, sourceRefs: e.sourceRefs });
      }
    } else if (e.kind === 'put-away') {
      requireId(e.objectId, 'object ID');
      requireId(e.destinationId, 'destination ID');
      requireId(e.receiptId, 'receipt ID');
      access(e.access);
      if (!DISPOSITIONS.has(e.disposition)) throw new Error('Invalid disposition');
      // Fixture assertions only; real movers must independently verify custody and landing.
      if (e.custodyConfirmed !== true || e.landingVerified !== true)
        throw new Error('Custody and verified landing required');
      if (receipts.some(r => r.receiptId === e.receiptId))
        throw new Error('Duplicate receipt ID');
      const pending = [...warnings.values()].filter(w =>
        w.objectId === e.objectId && sameAccess(w.access, e.access) && w.status === 'open');
      if (pending.length) throw new Error('Acknowledge open warnings before put-away');
      receipts.push({ objectId: e.objectId, access: e.access, receiptId: e.receiptId,
        destinationId: e.destinationId, disposition: e.disposition,
        recordedBy: e.recordedBy });
    } else {
      throw new Error('Unknown warning event kind');
    }
  }
  return { warnings, receipts };
}
// Logical in-memory CAS only, not durable or multi-process concurrency.
export function appendWarningEvent(ledger, event, expectedGeneration) {
  replay(ledger);
  if (expectedGeneration !== ledger.generation) throw new Error('Stale warning ledger');
  if (ledger.events.length >= LIMIT) throw new Error('Warning event limit');
  const candidate = structuredClone({ schema: WARNING_JACKET_SCHEMA,
    generation: ledger.generation + 1, events: [...ledger.events, event] });
  replay(candidate);
  return candidate;
}
// No global event count or hidden warning count appears in the projection.
// A trusted service must authenticate viewer and authorize object/source access.
export function readWarningJacket(ledger, objectId, viewer) {
  requireId(objectId, 'object ID');
  if (!obj(viewer)) throw new Error('Missing fixture viewer');
  const { warnings, receipts } = replay(ledger);
  return {
    objectId,
    warnings: [...warnings.values()]
      .filter(w => w.objectId === objectId && canRead(w.access, viewer))
      .map(w => structuredClone({
        warningId: w.warningId, code: w.code, explanation: w.explanation,
        status: w.status, sourceRefs: w.sourceRefs, history: w.history
      })).sort((a, b) => a.warningId.localeCompare(b.warningId)),
    putAwayReceipts: receipts
      .filter(r => r.objectId === objectId && canRead(r.access, viewer))
      .map(r => ({ receiptId: r.receiptId, destinationId: r.destinationId,
        disposition: r.disposition, recordedBy: r.recordedBy }))
  };
}
