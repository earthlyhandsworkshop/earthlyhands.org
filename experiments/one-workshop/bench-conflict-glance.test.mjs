import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectBenchConflicts } from './bench-conflict-glance.mjs';

const src = [{ id: 'invented-source-1', visibility: 'public' }];
const candidate = Object.freeze({
  id: 'arrival-a', objectId: 'fictional-object-a', visibility: 'public',
  revision: 'r2', assertionKey: 'invented.date', scopeKey: 'period-1',
  claimValue: 'Day two', sourceRefs: src, pairIds: ['arrival-paired']
});
const base = (overrides = {}) => ({ phase: 'working', audience: 'public', candidate, neighbors: [], ...overrides });
const codes = input => inspectBenchConflicts(input).map(w => w.code);
const peer = (changes = {}) => ({
  id: 'arrival-b', objectId: 'fictional-object-b', visibility: 'public',
  revision: 'r1', assertionKey: 'invented.date', scopeKey: 'period-1',
  claimValue: 'Day one', sourceRefs: src, ...changes
});
const crossing = (changes = {}) => ({
  verb: 'move', step: 'plan', authority: 'confirmed', destination: 'shelf-A',
  targetPath: 'shelf-A/object-a.md', movingIds: ['arrival-a', 'arrival-paired'],
  ...changes
});

test('exact claim and scope difference prompts source comparison, not a verdict', () => {
  const w = inspectBenchConflicts(base({ neighbors: [peer()] }));
  assert.deepEqual(w.map(x => x.code), ['claim-tension']);
  assert.deepEqual(w[0].relatedIds, ['arrival-b']);
  assert.match(w[0].inspect, /neither value is automatically false/i);
});
test('different scope or assertion key never becomes a contradiction by resemblance', () => {
  assert.deepEqual(codes(base({ neighbors: [peer({ scopeKey: 'period-2' }), peer({ id: 'c', assertionKey: 'invented.person' })] })), []);
});
test('same object with changed revision warns without overwriting anything', () => {
  const n = peer({ objectId: 'fictional-object-a', assertionKey: 'other.claim' });
  assert.deepEqual(codes(base({ neighbors: [n] })), ['version-divergence']);
});
test('hidden private conflict cannot change public warnings or their metadata', () => {
  const before = inspectBenchConflicts(base());
  const hidden = peer({ visibility: 'private', objectId: 'fictional-object-a' });
  const after = inspectBenchConflicts(base({ neighbors: [hidden] }));
  assert.deepEqual(after, before);
  assert.deepEqual(inspectBenchConflicts(base({ audience: 'private', neighbors: [hidden] })).map(x => x.code),
    ['claim-tension', 'version-divergence']);
});
test('malformed hidden records do not become a public existence signal', () => {
  assert.deepEqual(inspectBenchConflicts(base({ neighbors: [{ visibility: 'private', unexpected: true }] })), []);
});
test('a proposed wider view of a restricted source warns without naming the source', () => {
  const w = inspectBenchConflicts(base({ candidate: { ...candidate, sourceRefs: [{ id: 'restricted-fictional-source', visibility: 'private' }] } }));
  assert.deepEqual(w.map(x => x.code), ['source-audience-mismatch']);
  assert.equal(JSON.stringify(w).includes('restricted-fictional-source'), false);
});
test('an unsupported claim warns during work', () => {
  assert.deepEqual(codes(base({ candidate: { ...candidate, sourceRefs: [] } })), ['claim-without-source']);
});
test('a clearing proposal warns about unconfirmed authority and unnamed home', () => {
  assert.deepEqual(codes(base({ phase: 'clearing', crossing: crossing({ authority: 'unknown', destination: '' }) })),
    ['authority-unconfirmed', 'destination-not-named']);
});
test('a paired item cannot quietly be left behind by a proposed move', () => {
  const w = inspectBenchConflicts(base({ phase: 'clearing', crossing: crossing({ movingIds: ['arrival-a'] }) }));
  assert.deepEqual(w.map(x => x.code), ['pair-not-accounted-for']);
  assert.deepEqual(w[0].relatedIds, ['arrival-paired']);
});
test('only an exact target-file collision warns; a shared folder is not a conflict', () => {
  const n = peer({ assertionKey: 'other', targetPath: 'shelf-A/object-a.md' });
  assert.deepEqual(codes(base({ phase: 'clearing', crossing: crossing(), neighbors: [n] })), ['exact-target-collision']);
  assert.deepEqual(codes(base({ phase: 'clearing', crossing: crossing(), neighbors: [peer({ assertionKey: 'other', targetPath: 'shelf-A/other.md' })] })), []);
});
test('a locator must retain its original and verify the source before release', () => {
  assert.deepEqual(codes(base({ phase: 'clearing', crossing: crossing({ verb: 'release-locator', sourceReachable: false, moveOriginal: true }) })),
    ['locator-not-source', 'locator-source-unverified']);
});
test('a named unresolved rest is not a forced settlement', () => {
  assert.deepEqual(codes(base({ phase: 'clearing', crossing: crossing({ verb: 'close-encounter', hasUnresolved: true }) })), ['unresolved-rest-unaccounted']);
  assert.deepEqual(codes(base({ phase: 'clearing', crossing: crossing({ verb: 'close-encounter', hasUnresolved: true, unresolvedDisposition: 'named-rest' }) })), []);
});
test('final clearing checks landing and one-to-one receipt, not only intention', () => {
  assert.deepEqual(codes(base({ phase: 'clearing', crossing: crossing({ step: 'finish' }) })),
    ['crossing-receipt-missing', 'landing-not-verified']);
  assert.deepEqual(codes(base({ phase: 'clearing', crossing: crossing({ step: 'finish', landingVerified: true, receiptId: 'receipt-1' }) })), []);
});
test('a clean glance grants no permission and changes neither candidate nor neighbors', () => {
  const n = peer({ assertionKey: 'other' });
  const input = base({ phase: 'clearing', crossing: crossing(), neighbors: [n] });
  const before = structuredClone(input);
  assert.deepEqual(inspectBenchConflicts(input), []);
  assert.deepEqual(input, before);
});
test('unknown audience and missing clearing context fail closed', () => {
  assert.throws(() => inspectBenchConflicts(base({ audience: 'world' })), /Unknown/);
  assert.throws(() => inspectBenchConflicts(base({ phase: 'clearing' })), /Invalid crossing/);
});
