// One Workshop: isolated, fictional two-door return model.
// No Cloudflare API, rsync, credentials, durable transaction, live identity,
// or authority to publish. A server MUST authenticate/bind the context before
// calling; all state and policy maps must be server-owned, never client JSON.
import { decideWorkshopDoor } from './companion-door.mjs';

export const OUTBOX_SCHEMA = 'earthlyhands.offline-outbox.fixture.v0';
const copy = x => structuredClone(x);
const id = x => typeof x === 'string' && /^[a-z][a-z0-9:_-]{1,79}$/.test(x);
const record = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const exact = (x, keys) => record(x) &&
  Object.keys(x).sort().join(',') === keys.slice().sort().join(',');

// objects are *existing*, server-authorized objects with headRevisionId.
// Their creation, archival ingest, and rights examination live elsewhere.
export function newOutboxState(actors, objects) {
  if (!record(actors) || !record(objects)) throw new Error('Invalid policy maps');
  for (const [key, a] of Object.entries(actors)) {
    if (!id(key) || !record(a) || a.id !== key ||
        !['human', 'companion'].includes(a.kind) || a.status !== 'active' ||
        !Array.isArray(a.verbs)) throw new Error('Invalid actor fixture');
  }
  for (const [key, o] of Object.entries(objects)) {
    if (!id(key) || !record(o) || o.id !== key || !id(o.headRevisionId) ||
        !['workshop', 'private', 'public'].includes(o.exposure) ||
        !['affirmed', 'unknown', 'denied'].includes(o.rightsState) ||
        !Array.isArray(o.verbs) ||
        (o.exposure === 'private' && !id(o.ownerActorId)))
      throw new Error('Invalid object fixture');
  }
  const retainedObjects = copy(objects);
  for (const o of Object.values(retainedObjects)) o.baseRevisionId = o.headRevisionId;
  return { schema: OUTBOX_SCHEMA, actors: copy(actors), objects: retainedObjects,
    accepted: [], held: [] };
}

function validateEvent(e) {
  if (!exact(e, ['eventId', 'actorId', 'objectId', 'kind',
                  'parentRevisionId', 'scope', 'body']) ||
      !id(e.eventId) || !id(e.actorId) || !id(e.objectId) ||
      !['note', 'revision'].includes(e.kind) ||
      typeof e.body !== 'string' || !e.body.trim() || e.body.length > 10000 ||
      !['workshop', 'private'].includes(e.scope) ||
      (e.kind === 'note' && e.parentRevisionId !== null) ||
      (e.kind === 'revision' && !id(e.parentRevisionId)))
    throw new Error('Invalid outbox event');
}

const sameEvent = (a, b) => a.eventId === b.eventId &&
  a.actorId === b.actorId && a.objectId === b.objectId &&
  a.kind === b.kind && a.parentRevisionId === b.parentRevisionId &&
  a.scope === b.scope && a.body === b.body;

// Caller serializes this decision inside its real DB transaction. This pure
// function offers no cross-process CAS guarantee on its own.
export function receiveOutbox(state, entries, boundContext) {
  if (!record(state) || state.schema !== OUTBOX_SCHEMA ||
      !record(state.actors) || !record(state.objects) ||
      !Array.isArray(state.accepted) || !Array.isArray(state.held) ||
      !Array.isArray(entries) || entries.length > 100 ||
      !record(boundContext)) throw new Error('Invalid outbox crossing');
  const next = copy(state);
  const receipts = [];
  for (const input of entries) {
    validateEvent(input);
    const e = copy(input);
    const object = Object.hasOwn(next.objects, e.objectId)
      ? next.objects[e.objectId] : null;
    const decision = decideWorkshopDoor({
      request: { actorId: e.actorId, objectId: e.objectId, verb: 'contribute' },
      boundContext, actors: next.actors, objects: next.objects
    });
    if (!decision.allowed) throw new Error('Outbox admission denied: ' + decision.code);
    if (object.exposure !== e.scope || object.exposure === 'public')
      throw new Error('Outbox scope mismatch');

    const prior = next.accepted.find(x => x.eventId === e.eventId) ??
      next.held.find(x => x.event.eventId === e.eventId)?.event;
    if (prior) {
      if (!sameEvent(prior, e)) throw new Error('Outbox event ID reused with changed content');
      const held = next.held.some(x => x.event.eventId === e.eventId);
      receipts.push({ eventId: e.eventId, status: held ? 'already-held' : 'duplicate' });
      continue;
    }

    if (e.kind === 'revision') {
      const revisions = new Set([object.baseRevisionId]);
      for (const entry of next.accepted) {
        if (entry.objectId === e.objectId && entry.kind === 'revision')
          revisions.add(entry.eventId);
      }
      // An unknown parent is not a permissible 'conflict': it might refer
      // to an unreceived or invented history, which needs a separate intake.
      if (!revisions.has(e.parentRevisionId))
        throw new Error('Unknown parent revision; preserve offline outbox');
      if (e.parentRevisionId !== object.headRevisionId) {
        next.held.push({ event: e, blockedBy: object.headRevisionId });
        receipts.push({ eventId: e.eventId, status: 'held', blockedBy: object.headRevisionId });
        continue;
      }
      object.headRevisionId = e.eventId;
    }
    next.accepted.push(e);
    receipts.push({ eventId: e.eventId, status: 'accepted' });
  }
  return { state: next, receipts };
}

// Fixture-only projection: boundContext must come from an authenticated host,
// not be assembled from a visitor's claim. Held proposals are shown to their
// submitting actor, never silently promoted to the object's working head.
export function readOutboxForActor(state, boundContext) {
  if (!record(state) || state.schema !== OUTBOX_SCHEMA || !record(boundContext))
    throw new Error('Invalid read context');
  const result = [];
  for (const object of Object.values(state.objects)) {
    const actorId = boundContext.actorId;
    const decision = decideWorkshopDoor({
      request: { actorId, objectId: object.id, verb: 'read' },
      boundContext, actors: state.actors, objects: state.objects
    });
    if (!decision.allowed) continue;
    result.push({ objectId: object.id, headRevisionId: object.headRevisionId,
      accepted: copy(state.accepted.filter(x => x.objectId === object.id)),
      heldMine: copy(state.held.filter(x => x.event.objectId === object.id &&
        x.event.actorId === actorId)) });
  }
  return result;
}
