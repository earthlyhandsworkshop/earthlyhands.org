import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyLedger, appendEvent, readStanding } from './bench-standing.mjs';

const sourcePublic = [{ id: 'invented-register', visibility: 'public' }];
const sourcePrivate = [{ id: 'visitor-private-note', visibility: 'private' }];
const proposal = (id, visibility = 'workshop', sources = sourcePublic) => ({
  kind: 'propose', eventId: 'event-' + id, proposalId: id, propositionId: 'dates',
  standingText: 'In this invented ledger, a report date is not a payment date.',
  scopeKeys: ['invented-dates'], sourceRefs: sources, visibility,
  reopenWhen: 'A contrary dated primary account is inspected.', recordedBy: 'reader-a'
});
const settlement = (id, replaces = null) => ({
  kind: 'settle', eventId: 'approval-' + id, proposalId: id, replaces,
  reviewedBy: ['source-reader'], reviewBasis: 'Read the fictional dated register',
  recordedBy: 'reviewer-a'
});
const challenge = (id, visibility = 'workshop', sources = sourcePublic) => ({
  kind: 'challenge', eventId: 'challenge-' + id, targetsProposalId: id,
  reason: 'An attributable contrary document calls for another examination',
  visibility, sourceRefs: sources, recordedBy: 'reader-b'
});
const withdraw = id => ({
  kind: 'withdraw', eventId: 'withdraw-' + id, targetsProposalId: id,
  reason: 'A dated correction displaces this provisional standing',
  recordedBy: 'reviewer-a'
});
function start() {
  let l = emptyLedger();
  l = appendEvent(l, proposal('v1'), l.generation);
  l = appendEvent(l, settlement('v1'), l.generation);
  return l;
}
test('proposal is not a settlement or inherited standing', () => {
  const a = emptyLedger();
  const b = appendEvent(a, proposal('v1'), 0);
  assert.deepEqual(readStanding(b, 'invented-dates', 'workshop'), []);
  assert.equal(a.generation, 0);
});
test('settlement projects one scoped current distinction and preserves source road', () => {
  const l = start(), result = readStanding(l, 'invented-dates', 'workshop');
  assert.equal(result.length, 1);
  assert.equal(result[0].proposalId, 'v1');
  assert.deepEqual(result[0].sourceRefs, sourcePublic);
  assert.equal(result[0].challengePending, false);
  assert.deepEqual(readStanding(l, 'fictional-garden', 'workshop'), []);
});
test('a challenge flags review but does not silently cancel earned standing', () => {
  let l = start();
  l = appendEvent(l, challenge('v1'), l.generation);
  const x = readStanding(l, 'invented-dates', 'workshop')[0];
  assert.equal(x.proposalId, 'v1');
  assert.equal(x.challengePending, true);
  assert.equal(l.events.filter(e=>e.kind === 'settle').length, 1);
});
test('a private challenge does not leak a flag into the public projection', () => {
  let l = emptyLedger();
  l = appendEvent(l, proposal('v1', 'public'), l.generation);
  l = appendEvent(l, settlement('v1'), l.generation);
  l = appendEvent(l, challenge('v1', 'private', sourcePrivate), l.generation);
  assert.equal(readStanding(l, 'invented-dates', 'public')[0].challengePending, false);
  assert.equal(readStanding(l, 'invented-dates', 'private')[0].challengePending, true);
});
test('an explicit supersession changes current but keeps old events recoverable', () => {
  let l = start();
  l = appendEvent(l, proposal('v2'), l.generation);
  assert.equal(readStanding(l, 'invented-dates', 'workshop')[0].proposalId, 'v1');
  l = appendEvent(l, settlement('v2', 'v1'), l.generation);
  assert.equal(readStanding(l, 'invented-dates', 'workshop')[0].proposalId, 'v2');
  assert.ok(l.events.some(e => e.proposalId === 'v1'));
  assert.ok(l.events.some(e => e.proposalId === 'v2'));
});
test('an incoming settlement cannot quietly override current standing', () => {
  let l = start();
  l = appendEvent(l, proposal('v2'), l.generation);
  assert.throws(() => appendEvent(l, settlement('v2'), l.generation), /Standing changed/);
  assert.equal(readStanding(l, 'invented-dates', 'workshop')[0].proposalId, 'v1');
});
test('stale generation blocks a competing hand before mutation', () => {
  const l = start();
  assert.throws(() => appendEvent(l, proposal('v2'), 1), /Stale generation/);
  assert.equal(l.generation, 2);
});
test('public release refuses private source references', () => {
  let l = emptyLedger();
  l = appendEvent(l, proposal('v1', 'public', sourcePrivate), 0);
  assert.throws(() => appendEvent(l, settlement('v1'), 1), /Visibility exceeds/);
  assert.deepEqual(readStanding(l, 'invented-dates', 'public'), []);
});
test('workshop standing is not exposed to a public caller', () => {
  const l = start();
  assert.deepEqual(readStanding(l, 'invented-dates', 'public'), []);
  assert.equal(readStanding(l, 'invented-dates', 'private').length, 1);
});
test('private current standing cannot accidentally reveal older public standing', () => {
  let l = emptyLedger();
  l = appendEvent(l, proposal('v1', 'public'), l.generation);
  l = appendEvent(l, settlement('v1'), l.generation);
  l = appendEvent(l, proposal('v2', 'private', sourcePrivate), l.generation);
  l = appendEvent(l, settlement('v2', 'v1'), l.generation);
  assert.deepEqual(readStanding(l, 'invented-dates', 'public'), []);
  assert.equal(readStanding(l, 'invented-dates', 'private')[0].proposalId, 'v2');
});
test('a documented withdrawal removes current projection without erasing history', () => {
  let l = start();
  l = appendEvent(l, withdraw('v1'), l.generation);
  assert.deepEqual(readStanding(l, 'invented-dates', 'workshop'), []);
  assert.equal(l.events.length, 3);
});
test('invalid event kind, duplicate ID, and mismatched generation fail closed', () => {
  const l = start();
  assert.throws(() => appendEvent(l, {kind:'erase',eventId:'erase',recordedBy:'reader'}, l.generation), /Unknown/);
  assert.throws(() => appendEvent(l, proposal('v1'), l.generation), /Duplicate/);
  assert.throws(() => readStanding({...l,generation:50}, 'invented-dates', 'workshop'), /Invalid ledger/);
});
test('a stale challenge cannot attach itself to a replaced conclusion', () => {
  let l = start();
  l = appendEvent(l, proposal('v2'), l.generation);
  l = appendEvent(l, settlement('v2', 'v1'), l.generation);
  assert.throws(() => appendEvent(l, challenge('v1'), l.generation), /stale/);
});

test('hidden private events do not leak through public/workshop projection metadata', () => {
  let l = emptyLedger();
  l = appendEvent(l, proposal('v1', 'public'), l.generation);
  l = appendEvent(l, settlement('v1'), l.generation);
  const publicBefore = readStanding(l, 'invented-dates', 'public');
  const workshopBefore = readStanding(l, 'invented-dates', 'workshop');
  l = appendEvent(l, challenge('v1', 'private', sourcePrivate), l.generation);
  assert.equal(l.generation, 3); // a real hidden event happened
  assert.deepEqual(readStanding(l, 'invented-dates', 'public'), publicBefore);
  assert.deepEqual(readStanding(l, 'invented-dates', 'workshop'), workshopBefore);
  assert.equal(Object.hasOwn(publicBefore[0], 'ledgerGeneration'), false);
  assert.equal(readStanding(l, 'invented-dates', 'private')[0].challengePending, true);
});
