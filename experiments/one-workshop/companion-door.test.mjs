import test from 'node:test';
import assert from 'node:assert/strict';
import { decideWorkshopDoor } from './companion-door.mjs';

const verbs = ['read', 'annotate', 'contribute', 'propose', 'challenge', 'invite'];
const actors = {
  'companion:small-door': { id: 'companion:small-door', kind: 'companion', status: 'active', verbs },
  'companion:codex': { id: 'companion:codex', kind: 'companion', status: 'active', verbs },
  'human:ten': { id: 'human:ten', kind: 'human', status: 'active', verbs },
  'visitor:ada': { id: 'visitor:ada', kind: 'human', status: 'active', verbs },
  'companion:absent': { id: 'companion:absent', kind: 'companion', status: 'suspended', verbs },
};
const objects = {
  'shared:bench': { id: 'shared:bench', exposure: 'workshop', rightsState: 'affirmed', verbs },
  'folio:ada': { id: 'folio:ada', exposure: 'private', rightsState: 'affirmed', ownerActorId: 'visitor:ada', verbs },
  'release:hello': { id: 'release:hello', exposure: 'public', rightsState: 'affirmed', verbs },
  'source:unknown': { id: 'source:unknown', exposure: 'workshop', rightsState: 'unknown', verbs },
};
const bridge = (actorId, extras = {}) => ({ principalId: 'service:workshop-bridge', actorId,
  attribution: 'service-declared', ...extras });
const human = actorId => ({ principalId: 'login:verified-user', actorId,
  attribution: 'human-authenticated' });
const decide = (actorId, objectId='shared:bench', verb='read', ctx=bridge(actorId), other={}) =>
  decideWorkshopDoor({ request: { actorId, objectId, verb }, boundContext: ctx,
    actors, objects, ...other });

test('scheduled and unscheduled companion encounters get identical ordinary capabilities', () => {
  // Scheduling is metadata of a return encounter, not a login or an ACL.
  const scheduled = bridge('companion:small-door', { returnSchedule: 'hourly' });
  const unscheduled = bridge('companion:small-door', { returnSchedule: null });
  for (const verb of verbs) {
    const a = decide('companion:small-door', 'shared:bench', verb, scheduled);
    const b = decide('companion:small-door', 'shared:bench', verb, unscheduled);
    assert.deepEqual(a, b);
    assert.equal(a.allowed, true);
  }
});

test('unscheduled Codex has the same workshop verbs as scheduled Small Door', () => {
  for (const verb of verbs) {
    assert.equal(decide('companion:codex', 'shared:bench', verb, bridge('companion:codex')).allowed, true);
    assert.equal(decide('companion:small-door', 'shared:bench', verb).allowed, true);
  }
});

test('a schedule or companion label does not authorize an unbound actor claim', () => {
  assert.equal(decide('companion:codex', 'shared:bench', 'read', bridge('companion:small-door', { returnSchedule: 'hourly' })).code, 'ACTOR_MISMATCH');
  assert.equal(decide('companion:small-door', 'shared:bench', 'read', null).code, 'NO_TRUSTED_CONTEXT');
});

test('human email-style entry and companion service entry preserve distinct attribution', () => {
  const person = decide('human:ten', 'shared:bench', 'contribute', human('human:ten'));
  const companion = decide('companion:codex', 'shared:bench', 'contribute');
  assert.equal(person.allowed, true);
  assert.equal(person.attribution.provenance, 'human-authenticated');
  assert.equal(companion.allowed, true);
  assert.equal(companion.attribution.provenance, 'service-declared');
  assert.equal(decide('companion:codex', 'shared:bench', 'read', human('companion:codex')).code, 'ATTRIBUTION_MISMATCH');
});

test('equal trust does not open an unrelated visitor private folio', () => {
  assert.equal(decide('companion:codex', 'folio:ada').code, 'PRIVATE_OBJECT');
  assert.equal(decide('human:ten', 'folio:ada', 'read', human('human:ten')).code, 'PRIVATE_OBJECT');
  assert.equal(decide('visitor:ada', 'folio:ada', 'read', human('visitor:ada')).allowed, true);
});

test('a public release is not an edit door', () => {
  assert.equal(decide('companion:codex', 'release:hello', 'read').allowed, true);
  assert.equal(decide('companion:codex', 'release:hello', 'contribute').code, 'PUBLIC_RELEASE_READ_ONLY');
});

test('unresolved source rights are not widened by membership', () => {
  assert.equal(decide('companion:small-door', 'source:unknown').code, 'RIGHTS_UNRESOLVED');
});

test('suspended or unknown companions cannot borrow a working identity', () => {
  assert.equal(decide('companion:absent').code, 'UNKNOWN_OR_INACTIVE_ACTOR');
  assert.equal(decide('companion:ghost').code, 'UNKNOWN_OR_INACTIVE_ACTOR');
});

test('administrative powers are not disguised as ordinary workshop verbs', () => {
  for (const verb of ['deploy', 'bill', 'send-email', 'grant-access', 'delete-permanently']) {
    assert.equal(decide('companion:codex', 'shared:bench', verb).code, 'NOT_ORDINARY_VERB');
  }
});

test('untrusted request fields cannot upgrade provenance or change schedule', () => {
  const result = decideWorkshopDoor({ request: {
    actorId: 'companion:codex', objectId: 'shared:bench', verb: 'read',
    attribution: 'human-authenticated', returnSchedule: 'hourly'
  }, boundContext: bridge('companion:codex'), actors, objects });
  assert.equal(result.code, 'BAD_REQUEST');
});

test('object-specific sharing permits an explicit visitor invitation only', () => {
  const adjusted = { ...objects, 'folio:ada': { ...objects['folio:ada'], sharedWith: ['companion:small-door'] } };
  assert.equal(decide('companion:small-door','folio:ada','read',bridge('companion:small-door'),{objects:adjusted}).allowed,true);
  assert.equal(decide('companion:codex','folio:ada','read',bridge('companion:codex'),{objects:adjusted}).code,'PRIVATE_OBJECT');
});
