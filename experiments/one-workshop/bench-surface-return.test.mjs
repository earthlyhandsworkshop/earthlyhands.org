import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyBenchSurface, appendBenchSurfaceEvent, readBenchSurface } from './bench-surface-return.mjs';

const workshop = { kind: 'workshop' };
const alice = { authenticated: true, workshopMember: true, principalId: 'alice' };
const bob = { authenticated: true, workshopMember: true, principalId: 'bob' };
const visitor = { authenticated: false, principalId: 'visitor' };
const place = (i, by = 'alice') => ({
  kind: 'place', eventId: 'place-' + i, by,
  item: { itemId: 'leaf-' + i, sourceId: 'source-' + i,
    warningIds: i === 7 ? ['warning-open-7'] : [] }
});
const clear = (ids, by = 'alice', batchId = 'batch-14') => ({
  kind: 'clear', eventId: 'clear-' + batchId, by, batchId, itemIds: ids
});
const restore = (batchId = 'batch-14', by = 'bob', eventId = 'restore-14') => ({
  kind: 'restore', eventId, by, batchId
});
const append = (l, e, actor = alice) => appendBenchSurfaceEvent(l, e, l.generation, actor);
function fourteen() {
  let l = emptyBenchSurface('old-growth', workshop);
  for (let i = 1; i <= 14; i++) l = append(l, place(i));
  return l;
}
const ids = Array.from({ length: 14 }, (_, i) => 'leaf-' + (i + 1));

test('one worker clears fourteen exact items and another restores all in one act', () => {
  let l = fourteen();
  l = append(l, clear(ids));
  const cleared = readBenchSurface(l, bob);
  assert.deepEqual(cleared.activeItems, []);
  assert.equal(cleared.batches[0].itemIds.length, 14);
  assert.equal(cleared.batches[0].clearedBy, 'alice');
  assert.equal(cleared.batches[0].restorable, true);
  l = append(l, restore(), bob);
  const back = readBenchSurface(l, alice);
  assert.deepEqual(back.activeItems.map(x => x.itemId), ids);
  assert.equal(back.batches[0].restoredBy, 'bob');
  assert.equal(back.batches[0].restorable, false);
  assert.deepEqual(back.trace.slice(-2).map(x => x.kind), ['clear', 'restore']);
});
test('unresolved warning pointer remains attached after clearing and restoring', () => {
  let l = fourteen();
  l = append(l, clear(ids));
  l = append(l, restore(), bob);
  assert.deepEqual(readBenchSurface(l, alice).activeItems[6].warningIds, ['warning-open-7']);
});
test('new work arriving after clearing survives restoration of the earlier fourteen', () => {
  let l = append(fourteen(), clear(ids));
  l = append(l, place(15));
  l = append(l, restore(), bob);
  const active = readBenchSurface(l, bob).activeItems;
  assert.equal(active.length, 15);
  assert.equal(active[0].itemId, 'leaf-15');
  assert.equal(active.filter(x => x.itemId === 'leaf-15').length, 1);
});
test('notification suggestions are visible but no message is actually sent', () => {
  let l = append(fourteen(), clear(ids));
  l = append(l, restore(), bob);
  const notices = readBenchSurface(l, alice).notificationSuggestions;
  assert.deepEqual(notices.map(x => x.kind), ['clear', 'restore']);
  assert.deepEqual(notices.map(x => x.itemCount), [14, 14]);
  assert.ok(notices.every(x => x.delivery === 'not-sent'));
});
test('a clear cannot silently omit one item or include a nonexistent item', () => {
  const l = fourteen();
  assert.throws(() => append(l, clear(ids.slice(0, 13))), /exactly/);
  assert.throws(() => append(l, clear([...ids.slice(0, 13), 'missing'])), /exactly/);
  assert.equal(readBenchSurface(l, alice).activeItems.length, 14);
});
test('restoring does not erase the historical clearing trace', () => {
  let l = append(fourteen(), clear(ids));
  l = append(l, restore(), bob);
  const view = readBenchSurface(l, alice);
  assert.equal(view.trace.at(-2).by, 'alice');
  assert.equal(view.trace.at(-1).by, 'bob');
  assert.equal(view.batches[0].clearedBy, 'alice');
  assert.equal(view.batches[0].restoredBy, 'bob');
});
test('a stale generation cannot overwrite another worker\'s clearing', () => {
  const l = fourteen();
  const after = append(l, clear(ids));
  assert.throws(() => appendBenchSurfaceEvent(after, restore(), l.generation, bob), /Stale/);
  assert.equal(readBenchSurface(after, bob).activeItems.length, 0);
});
test('repeated restoration refuses instead of silently replaying an old batch', () => {
  let l = append(fourteen(), clear(ids));
  l = append(l, restore(), bob);
  assert.throws(() => append(l, restore('batch-14', 'bob', 'restore-again'), bob), /already restored/);
});
test('an ordinary authorized coworker can clear without the original maker approving each locator', () => {
  let l = fourteen();
  l = append(l, clear(ids, 'bob'), bob);
  assert.equal(readBenchSurface(l, alice).batches[0].clearedBy, 'bob');
});
test('unauthenticated visitors cannot clear or see the internal workbench', () => {
  const l = fourteen();
  assert.equal(readBenchSurface(l, visitor), null);
  assert.throws(() => appendBenchSurfaceEvent(l, clear(ids, 'visitor'), l.generation, visitor), /permission/);
});
test('a caller cannot impersonate a different worker in the receipt', () => {
  const l = fourteen();
  assert.throws(() => appendBenchSurfaceEvent(l, clear(ids, 'alice'), l.generation, bob), /permission/);
});
test('Bello competitor and other match see neither items nor clearing count or traces', () => {
  const aAccess = { kind: 'bello-player', ownerId: 'player-a', matchId: 'match-1' };
  const playerA = { authenticated: true, workshopMember: true, principalId: 'player-a', matchId: 'match-1' };
  const rival = { authenticated: true, workshopMember: true, principalId: 'player-b', matchId: 'match-1' };
  const otherMatch = { authenticated: true, workshopMember: true, principalId: 'player-a', matchId: 'match-2' };
  let l = emptyBenchSurface('private-game', aAccess);
  l = append(l, place(1, 'player-a'), playerA);
  l = append(l, clear(['leaf-1'], 'player-a', 'private-batch'), playerA);
  assert.equal(readBenchSurface(l, rival), null);
  assert.equal(readBenchSurface(l, otherMatch), null);
  assert.equal(readBenchSurface(l, visitor), null);
  assert.equal(readBenchSurface(l, playerA).batches[0].itemIds.length, 1);
  assert.throws(() => appendBenchSurfaceEvent(l, restore('private-batch', 'player-b'), l.generation, rival), /permission/);
});
test('private owner can restore while another member cannot inspect or tidy', () => {
  const privateAccess = { kind: 'private', ownerId: 'alice' };
  let l = emptyBenchSurface('private-bench', privateAccess);
  l = append(l, place(1));
  l = append(l, clear(['leaf-1']));
  assert.equal(readBenchSurface(l, bob), null);
  assert.throws(() => appendBenchSurfaceEvent(l, restore('batch-14', 'bob'), l.generation, bob), /permission/);
  l = append(l, restore('batch-14', 'alice'), alice);
  assert.equal(readBenchSurface(l, alice).activeItems.length, 1);
});
test('a cleared item cannot be reintroduced as a new item instead of a traceable restoration', () => {
  const l = append(fourteen(), clear(ids));
  assert.throws(() => append(l, { ...place(7), eventId: 'new-place-seven' }), /Duplicate item identity/);
});
test('an old batch can be cleared again after restoration, without erasing either receipt', () => {
  let l = append(fourteen(), clear(ids));
  l = append(l, restore(), bob);
  l = append(l, clear(ids, 'bob', 'second-batch'), bob);
  const view = readBenchSurface(l, alice);
  assert.equal(view.batches.length, 2);
  assert.equal(view.batches[0].restored, true);
  assert.equal(view.batches[1].restored, false);
  assert.equal(view.activeItems.length, 0);
});
test('source documents are never edited, moved or published by clearing/restoring', () => {
  const original = Object.freeze({ id: 'source-7', text: 'Unchanged invented source' });
  const before = structuredClone(original);
  let l = append(fourteen(), clear(ids));
  l = append(l, restore(), bob);
  assert.deepEqual(original, before);
  assert.equal(Object.hasOwn(l, 'sourceBodies'), false);
  assert.equal(Object.hasOwn(l, 'published'), false);
});
test('invalid duplicate batch or event identity cannot replace a prior receipt', () => {
  const l = append(fourteen(), clear(ids));
  assert.throws(() => append(l, clear(ids)), /Duplicate event ID/);
  assert.throws(() => append(l, { ...restore(), eventId: 'clear-batch-14' }, bob), /Duplicate event ID/);
});
