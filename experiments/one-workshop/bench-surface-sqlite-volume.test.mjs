import test from 'node:test';
import assert from 'node:assert/strict';
import { setup, populate, item, ids, workshop, alice, bob, guest } from './bench-sqlite-fixtures.mjs';
test('notification suggestions are paginated, not delivered', t => {
  const { db } = setup(t);
  let gen = db.place('old-growth', item(1), alice, 0, 'place-1');
  gen = db.clear('old-growth', 'batch-1', ['leaf-1'], alice, gen, 'clear-1');
  gen = db.restore('old-growth', 'batch-1', bob, gen, 'restore-1');
  const first = db.readNoticeSuggestions('old-growth', alice, { after: 0, limit: 1 });
  const next = db.readNoticeSuggestions('old-growth', alice, { after: first[0].sequence, limit: 1 });
  assert.deepEqual([first[0].kind, next[0].kind], ['clear', 'restore']);
  assert.ok([...first, ...next].every(x => x.delivery === 'not-sent'));
  assert.equal(db.readNoticeSuggestions('old-growth', alice, { after: next[0].sequence }).length, 0);
});

test('Bello rival and another match see neither active, batch, trace, nor notices', t => {
  const access = { kind: 'bello-player', ownerId: 'player-a', matchId: 'match-1' };
  const owner = { authenticated: true, workshopMember: true, principalId: 'player-a', matchId: 'match-1' };
  const rival = { authenticated: true, workshopMember: true, principalId: 'player-b', matchId: 'match-1' };
  const other = { authenticated: true, workshopMember: true, principalId: 'player-a', matchId: 'match-2' };
  const { db } = setup(t, access);
  let gen = db.place('old-growth', item(1, access), owner, 0, 'place-1');
  gen = db.clear('old-growth', 'private-batch', ['leaf-1'], owner, gen, 'clear-private');
  for (const viewer of [rival, other, guest]) {
    assert.equal(db.readActive('old-growth', viewer), null);
    assert.equal(db.readBatch('old-growth', 'private-batch', viewer), null);
    assert.equal(db.readTrace('old-growth', viewer), null);
    assert.equal(db.readNoticeSuggestions('old-growth', viewer), null);
  }
  assert.throws(() => db.restore('old-growth', 'private-batch', rival, gen, 'rival-restore'), /permission/);
  assert.equal(db.readBatch('old-growth', 'private-batch', owner).items.length, 1);
});

test('a private locator cannot enter a broader workshop bench', t => {
  const { db } = setup(t);
  assert.throws(() => db.place('old-growth', item(1, { kind: 'private', ownerId: 'alice' }), alice, 0, 'bad'), /access does not match/);
  assert.equal(db.readActive('old-growth', alice).generation, 0);
});

test('separate benches retain isolated event histories and generations', t => {
  const { db } = setup(t);
  db.createBench('other-bench', workshop);
  db.place('old-growth', item(1), alice, 0, 'shared-event-id');
  db.place('other-bench', item(2), bob, 0, 'shared-event-id');
  assert.deepEqual(db.readActive('old-growth', alice).activeItems.map(x => x.itemId), ['leaf-1']);
  assert.deepEqual(db.readActive('other-bench', bob).activeItems.map(x => x.itemId), ['leaf-2']);
  assert.equal(db.readTrace('old-growth', alice).length, 1);
  assert.equal(db.readTrace('other-bench', bob).length, 1);
});

test('high-volume single-bench crossing passes the old 2,000-event ceiling without replay', t => {
  const { db } = setup(t);
  let gen = db.place('old-growth', item(1), alice, 0, 'place-1');
  // 2,500 complete cycles = 5,001 durable events, with bounded page reads.
  for (let i = 1; i <= 2500; i++) {
    gen = db.clear('old-growth', 'batch-' + i, ['leaf-1'], alice, gen, 'clear-' + i);
    gen = db.restore('old-growth', 'batch-' + i, bob, gen, 'restore-' + i);
  }
  assert.equal(gen, 5001);
  assert.equal(db.readActive('old-growth', alice).generation, 5001);
  assert.equal(db.readActive('old-growth', alice).activeItems.length, 1);
  assert.equal(db.readTrace('old-growth', alice, { after: 0, limit: 100 }).length, 100);
  assert.equal(db.readTrace('old-growth', alice, { after: 5000, limit: 100 })[0].sequence, 5001);
  assert.equal(db.readNoticeSuggestions('old-growth', alice, { after: 4999 }).length, 2);
  assert.equal(db.readBatch('old-growth', 'batch-1', alice).restored, true);
  assert.equal(db.readBatch('old-growth', 'batch-2500', alice).restored, true);
});

test('trace pages reject unbounded requests rather than returning entire history', t => {
  const { db } = setup(t);
  assert.throws(() => db.readTrace('old-growth', alice, { limit: 100000 }), /Invalid trace page/);
  assert.throws(() => db.readNoticeSuggestions('old-growth', alice, { after: -1 }), /Invalid trace page/);
});
