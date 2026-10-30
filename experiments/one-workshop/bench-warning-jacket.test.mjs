import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyWarningJacket, appendWarningEvent, readWarningJacket } from './bench-warning-jacket.mjs';

const PUBLIC = { kind: 'public' };
const WORKSHOP = { kind: 'workshop' };
const PRIVATE_A = { kind: 'private', ownerId: 'maker-a' };
const BELLO_A = { kind: 'bello-player', ownerId: 'player-a', matchId: 'match-1' };
const BELLO_B = { kind: 'bello-player', ownerId: 'player-b', matchId: 'match-1' };
const BELLO_A2 = { kind: 'bello-player', ownerId: 'player-a', matchId: 'match-2' };
const publicViewer = { principalId: 'visitor' };
const privateViewer = { principalId: 'maker-a' };
const aViewer = { principalId: 'player-a', matchId: 'match-1' };
const bViewer = { principalId: 'player-b', matchId: 'match-1' };
const append = (ledger, event) => appendWarningEvent(ledger, event, ledger.generation);
const warning = (warningId = 'warn-1', access = PUBLIC, changes = {}) => ({
  kind: 'warn', eventId: 'event-' + warningId, warningId,
  objectId: 'object-1', code: 'claim-tension',
  explanation: 'Two fictional dates disagree; compare original sources.',
  access, sourceRefs: [{ id: 'source-public', access: PUBLIC }],
  recordedBy: 'small-door', ...changes
});
const ack = (warningId = 'warn-1', changes = {}) => ({
  kind: 'acknowledge', eventId: 'ack-' + warningId, warningId,
  note: 'I have read the warning; the question remains open.',
  recordedBy: 'reader-a', ...changes
});
const resolve = (warningId = 'warn-1', changes = {}) => ({
  kind: 'resolve', eventId: 'resolve-' + warningId, warningId,
  note: 'The invented dated original resolves this particular warning.',
  sourceRefs: [{ id: 'resolution-public', access: PUBLIC }],
  recordedBy: 'reader-b', ...changes
});
const reopen = (warningId = 'warn-1', changes = {}) => ({
  kind: 'reopen', eventId: 'reopen-' + warningId, warningId,
  note: 'A new fictional source requires fresh examination.',
  sourceRefs: [{ id: 'new-public', access: PUBLIC }],
  recordedBy: 'reader-c', ...changes
});
const putAway = (access = PUBLIC, changes = {}) => ({
  kind: 'put-away', eventId: 'put-away-1', objectId: 'object-1',
  receiptId: 'receipt-1', destinationId: 'shelf-one',
  custodyConfirmed: true, landingVerified: true,
  disposition: 'quiet', access, recordedBy: 'keeper-a', ...changes
});
const read = (l, viewer = publicViewer) => readWarningJacket(l, 'object-1', viewer);

test('acknowledged but unresolved warning follows a quiet put-away', () => {
  let l = append(emptyWarningJacket(), warning());
  l = append(l, ack());
  l = append(l, putAway());
  const view = read(l);
  assert.equal(view.warnings[0].status, 'acknowledged');
  assert.equal(view.warnings[0].history[1].kind, 'acknowledge');
  assert.equal(view.putAwayReceipts[0].destinationId, 'shelf-one');
  assert.equal(view.putAwayReceipts[0].disposition, 'quiet');
});
test('an unacknowledged warning does not vanish through a put-away receipt', () => {
  const l = append(emptyWarningJacket(), warning());
  assert.throws(() => append(l, putAway()), /Acknowledge open warnings/);
  assert.equal(l.generation, 1);
  assert.equal(read(l).warnings[0].status, 'open');
});
test('a warning may resolve directly, and the source road survives a triumphant return', () => {
  let l = append(emptyWarningJacket(), warning());
  l = append(l, resolve());
  l = append(l, putAway(PUBLIC, { disposition: 'triumphant' }));
  const view = read(l);
  assert.equal(view.warnings[0].status, 'resolved');
  assert.equal(view.warnings[0].history[1].kind, 'resolve');
  assert.equal(view.warnings[0].history[1].sourceRefs[0].id, 'resolution-public');
  assert.equal(view.putAwayReceipts[0].disposition, 'triumphant');
});
test('new evidence reopens a resolved warning without erasing earlier rest or resolution', () => {
  let l = append(emptyWarningJacket(), warning());
  l = append(l, ack());
  l = append(l, putAway());
  l = append(l, resolve());
  l = append(l, reopen());
  assert.equal(read(l).warnings[0].status, 'open');
  assert.deepEqual(read(l).warnings[0].history.map(x => x.kind),
    ['warn', 'acknowledge', 'resolve', 'reopen']);
  assert.equal(read(l).putAwayReceipts.length, 1);
  assert.throws(() => append(l, putAway(PUBLIC, { eventId: 'put-away-2', receiptId: 'receipt-2' })),
    /Acknowledge open warnings/);
  l = append(l, ack('warn-1', { eventId: 'ack-again' }));
  l = append(l, putAway(PUBLIC, { eventId: 'put-away-2', receiptId: 'receipt-2', destinationId: 'shelf-two' }));
  assert.deepEqual(read(l).putAwayReceipts.map(x => x.destinationId), ['shelf-one', 'shelf-two']);
});
test('an encounter without warnings can be put away quietly', () => {
  const l = append(emptyWarningJacket(), putAway());
  assert.deepEqual(read(l).warnings, []);
  assert.equal(read(l).putAwayReceipts.length, 1);
});
test('hidden private warning, acknowledgement and rest leave the entire public projection identical', () => {
  let l = emptyWarningJacket();
  const before = read(l);
  l = append(l, warning('secret-warning', PRIVATE_A, {
    explanation: 'Fictional private disagreement',
    sourceRefs: [{ id: 'secret-source', access: PRIVATE_A }]
  }));
  l = append(l, ack('secret-warning'));
  l = append(l, putAway(PRIVATE_A));
  assert.deepEqual(read(l), before);
  const privateView = read(l, privateViewer);
  assert.equal(privateView.warnings.length, 1);
  assert.equal(privateView.putAwayReceipts.length, 1);
  assert.equal(JSON.stringify(read(l)).includes('secret'), false);
});
test('Bello competitors cannot read each other\'s warning, resolution, or rest receipt', () => {
  let l = emptyWarningJacket();
  l = append(l, warning('bello-a', BELLO_A, {
    explanation: 'Private fictional game assessment',
    sourceRefs: [{ id: 'player-a-private', access: BELLO_A }]
  }));
  l = append(l, ack('bello-a'));
  l = append(l, putAway(BELLO_A));
  l = append(l, resolve('bello-a', {
    sourceRefs: [{ id: 'player-a-resolution', access: BELLO_A }]
  }));
  assert.equal(read(l, aViewer).warnings.length, 1);
  assert.equal(read(l, aViewer).warnings[0].status, 'resolved');
  assert.equal(read(l, aViewer).putAwayReceipts.length, 1);
  assert.deepEqual(read(l, bViewer), read(emptyWarningJacket(), bViewer));
  assert.deepEqual(read(l, publicViewer), read(emptyWarningJacket(), publicViewer));
});
test('the same Bello player cannot cross match compartments by identity alone', () => {
  let l = append(emptyWarningJacket(), warning('match-two', BELLO_A2));
  assert.equal(read(l, aViewer).warnings.length, 0);
  assert.equal(read(l, { principalId: 'player-a', matchId: 'match-2' }).warnings.length, 1);
});
test('Bello cannot cite a rival player\'s restricted source in its own warning', () => {
  assert.throws(() => append(emptyWarningJacket(), warning('bello-a', BELLO_A, {
    sourceRefs: [{ id: 'rival-private', access: BELLO_B }]
  })), /Source access exceeds/);
});
test('public warning cannot cite a private source and expose its identity', () => {
  const l = emptyWarningJacket();
  assert.throws(() => append(l, warning('public-warning', PUBLIC, {
    sourceRefs: [{ id: 'private-source', access: PRIVATE_A }]
  })), /Source access exceeds/);
  assert.deepEqual(read(l).warnings, []);
});
test('a private resolution cannot launder a secret source into a public jacket', () => {
  let l = append(emptyWarningJacket(), warning());
  assert.throws(() => append(l, resolve('warn-1', {
    sourceRefs: [{ id: 'private-resolution', access: PRIVATE_A }]
  })), /Source access exceeds/);
  assert.equal(read(l).warnings[0].status, 'open');
});
test('acknowledgement does not override missing custody or landing verification', () => {
  let l = append(emptyWarningJacket(), warning());
  l = append(l, ack());
  assert.throws(() => append(l, putAway(PUBLIC, { custodyConfirmed: false })), /Custody and verified landing/);
  assert.throws(() => append(l, putAway(PUBLIC, { landingVerified: false })), /Custody and verified landing/);
  assert.deepEqual(read(l).putAwayReceipts, []);
});
test('a workshop-only warning does not leak to an unaffiliated visitor', () => {
  let l = append(emptyWarningJacket(), warning('workshop-warning', WORKSHOP));
  assert.equal(read(l, publicViewer).warnings.length, 0);
  assert.equal(read(l, { principalId: 'worker', workshopMember: true }).warnings.length, 1);
});
test('stale append and duplicate IDs fail without modifying earlier ledger', () => {
  const l = append(emptyWarningJacket(), warning());
  assert.throws(() => appendWarningEvent(l, ack(), 0), /Stale warning ledger/);
  assert.throws(() => append(l, warning()), /Duplicate event ID/);
  assert.equal(l.generation, 1);
});
test('put-away receipts have distinct IDs and do not silently replace each other', () => {
  let l = append(emptyWarningJacket(), putAway());
  assert.throws(() => append(l, putAway(PUBLIC, { eventId: 'put-away-2' })), /Duplicate receipt ID/);
  l = append(l, putAway(PUBLIC, { eventId: 'put-away-2', receiptId: 'receipt-2' }));
  assert.equal(read(l).putAwayReceipts.length, 2);
});
test('a newly discovered warning remains visible when old stored work is reopened', () => {
  let l = append(emptyWarningJacket(), putAway());
  l = append(l, warning());
  assert.equal(read(l).putAwayReceipts.length, 1);
  assert.equal(read(l).warnings[0].status, 'open');
});
test('warning projection does not expose global generation or hidden event counts', () => {
  let l = append(emptyWarningJacket(), warning());
  const before = read(l);
  l = append(l, warning('hidden', PRIVATE_A, {
    sourceRefs: [{ id: 'hidden-source', access: PRIVATE_A }]
  }));
  assert.deepEqual(read(l), before);
  assert.equal(Object.hasOwn(before, 'generation'), false);
  assert.equal(Object.hasOwn(before, 'hiddenCount'), false);
});
test('the model records a put-away claim but never moves, publishes or edits source objects', () => {
  const original = Object.freeze({ objectId: 'object-1', body: 'Invented unaltered document' });
  const before = structuredClone(original);
  const l = append(emptyWarningJacket(), putAway());
  assert.deepEqual(original, before);
  assert.equal(read(l).putAwayReceipts.length, 1);
  assert.equal(Object.hasOwn(l, 'published'), false);
});
test('unknown transitions and forged journal generation are rejected', () => {
  const l = append(emptyWarningJacket(), warning());
  assert.throws(() => append(l, reopen()), /Only resolved warnings may reopen/);
  assert.throws(() => append(l, { kind: 'delete', eventId: 'bad', recordedBy: 'actor' }), /Unknown warning event kind/);
  assert.throws(() => readWarningJacket({ ...l, generation: 900 }, 'object-1', publicViewer), /Invalid warning ledger/);
});
