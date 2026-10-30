// One Workshop / Small Door: schedule-neutral admission *decision* specimen.
// Fictional trusted contexts only. This is not a login system, a credential
// validator, a signed identity, or a deployed access-control boundary.
// The actual service MUST construct boundContext only after it authenticates
// a human/bridge and validates the bridge's actor claim. Never deserialize
// boundContext directly from a browser/request or treat a companion name as proof.

const ORDINARY_VERBS = new Set([
  'read', 'annotate', 'contribute', 'propose', 'challenge', 'invite',
]);
const EXPOSURES = new Set(['workshop', 'private', 'public']);
const ATTRIBUTIONS = new Set(['human-authenticated', 'service-declared']);

const deny = code => Object.freeze({ allowed: false, code });

function plainRecord(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function hasOnlyKeys(record, keys) {
  return Object.keys(record).every(key => keys.includes(key));
}

/**
 * Pure authorization-policy specimen. boundContext, actors, and objects
 * are SERVER-owned inputs. request is caller-controlled and is NOT trusted.
 * An assertion "service-declared" traces the bridge's statement; it does NOT
 * establish a persistent cryptographic identity for a ChatGPT companion.
 */
export function decideWorkshopDoor({ request, boundContext, actors, objects }) {
  if (!plainRecord(request) || !plainRecord(boundContext) ||
      !plainRecord(actors) || !plainRecord(objects)) return deny('NO_TRUSTED_CONTEXT');
  if (!hasOnlyKeys(request, ['actorId', 'objectId', 'verb'])) return deny('BAD_REQUEST');
  if (typeof request.actorId !== 'string' || typeof request.objectId !== 'string' ||
      typeof request.verb !== 'string') return deny('BAD_REQUEST');
  if (!ORDINARY_VERBS.has(request.verb)) return deny('NOT_ORDINARY_VERB');
  // Actual authentication and binding MUST occur before this function.
  if (typeof boundContext.principalId !== 'string' ||
      !boundContext.principalId ||
      typeof boundContext.actorId !== 'string' ||
      !ATTRIBUTIONS.has(boundContext.attribution)) return deny('NO_TRUSTED_CONTEXT');
  if (boundContext.actorId !== request.actorId) return deny('ACTOR_MISMATCH');

  const actor = Object.hasOwn(actors, request.actorId)
    ? actors[request.actorId] : null;
  if (!plainRecord(actor) || actor.id !== request.actorId ||
      !['human', 'companion'].includes(actor.kind) ||
      actor.status !== 'active' || !Array.isArray(actor.verbs)) return deny('UNKNOWN_OR_INACTIVE_ACTOR');
  if (actor.kind === 'human' && boundContext.attribution !== 'human-authenticated')
    return deny('ATTRIBUTION_MISMATCH');
  if (actor.kind === 'companion' && boundContext.attribution !== 'service-declared')
    return deny('ATTRIBUTION_MISMATCH');
  if (!actor.verbs.includes(request.verb)) return deny('NO_ACTOR_CAPABILITY');

  const object = Object.hasOwn(objects, request.objectId)
    ? objects[request.objectId] : null;
  if (!plainRecord(object) || object.id !== request.objectId ||
      !EXPOSURES.has(object.exposure) || !Array.isArray(object.verbs))
    return deny('UNKNOWN_OBJECT');
  if (object.rightsState !== 'affirmed') return deny('RIGHTS_UNRESOLVED');
  if (!object.verbs.includes(request.verb)) return deny('OBJECT_VERB_DENIED');
  if (object.exposure === 'private' && object.ownerActorId !== request.actorId &&
      !(Array.isArray(object.sharedWith) && object.sharedWith.includes(request.actorId)))
    return deny('PRIVATE_OBJECT');
  if (object.exposure === 'public' && request.verb !== 'read')
    return deny('PUBLIC_RELEASE_READ_ONLY');

  // The absence/presence of a return schedule is deliberately irrelevant.
  // A stable actor ID survives an ad-hoc conversation, not proof that the
  // present conversation is the same personality across machines or times.
  return Object.freeze({
    allowed: true,
    code: 'ALLOWED',
    attribution: Object.freeze({
      principalId: boundContext.principalId,
      actorId: actor.id,
      actorKind: actor.kind,
      provenance: boundContext.attribution,
    }),
    objectId: object.id,
    verb: request.verb,
  });
}
