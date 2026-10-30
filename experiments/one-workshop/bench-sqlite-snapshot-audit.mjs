// Secondary, semantic cross-check of a fictional Workbench SQLite snapshot.
// It catches inconsistent clear/restore receipts after structural SQLite checks.
// It is NOT an authenticated source of history, a signature, or an event-chain proof:
// the current v0 place receipt does not include the placed item ID.
import { id } from './bench-sqlite-core.mjs';

function refuse(condition, detail) {
  if (!condition) throw new Error('Snapshot receipt graph mismatch: ' + detail);
}
function safeCount(n, min, max) {
  return Number.isSafeInteger(n) && n >= min && n <= max;
}

export function auditBenchSnapshotReceipts(db) {
  const itemsFor = db.prepare('SELECT item_id,active FROM items WHERE bench_id=?');
  const batchesFor = db.prepare('SELECT batch_id,cleared_by,restored_by FROM batches WHERE bench_id=?');
  const membersFor = db.prepare(`SELECT item_id,ordinal FROM batch_items
    WHERE bench_id=? AND batch_id=? ORDER BY ordinal,item_id`);
  const eventsFor = db.prepare(`SELECT seq,event_id,kind,actor,batch_id,item_count
    FROM events WHERE bench_id=? ORDER BY seq`);

  for (const { bench_id: benchId } of db.prepare('SELECT bench_id FROM benches').iterate()) {
    refuse(id(benchId), 'invalid bench ID');
    const items = itemsFor.all(benchId);
    const states = new Map();
    for (const item of items) {
      refuse(id(item.item_id) && !states.has(item.item_id), 'invalid/duplicate item');
      states.set(item.item_id, true); // Before its first clear, an item starts active.
    }
    const batches = new Map();
    for (const batch of batchesFor.all(benchId)) {
      refuse(id(batch.batch_id) && id(batch.cleared_by) &&
        (batch.restored_by === null || id(batch.restored_by)), 'invalid batch metadata');
      const members = membersFor.all(benchId, batch.batch_id);
      refuse(safeCount(members.length, 1, 500), 'invalid batch size');
      for (let n = 0; n < members.length; n++) {
        refuse(members[n].ordinal === n && states.has(members[n].item_id),
          'inconsistent batch order or missing member');
      }
      batches.set(batch.batch_id, { ...batch, members: members.map(x => x.item_id),
        clearSeq: null, restoreSeq: null });
    }
    let sequence = 0, placeCount = 0, activeCount = 0;
    for (const event of eventsFor.iterate(benchId)) {
      sequence++;
      refuse(event.seq === sequence && id(event.event_id) && id(event.actor),
        'nonsequential or invalid event');
      if (event.kind === 'place') {
        refuse(event.batch_id === null && event.item_count === 1,
          'invalid place receipt');
        placeCount++;
        activeCount++;
        continue;
      }
      refuse(event.kind === 'clear' || event.kind === 'restore',
        'unknown event kind');
      refuse(id(event.batch_id) && batches.has(event.batch_id),
        'event references no clearing batch');
      const batch = batches.get(event.batch_id);
      refuse(event.item_count === batch.members.length,
        'receipt does not count its exact batch members');
      if (event.kind === 'clear') {
        refuse(batch.clearSeq === null && event.actor === batch.cleared_by,
          'missing, duplicate or wrong-hand clearing');
        refuse(activeCount === batch.members.length,
          'clear does not cover the entire then-active bench');
        for (const member of batch.members) {
          refuse(states.get(member) === true, 'clearing a non-active member');
          states.set(member, false);
        }
        batch.clearSeq = sequence;
        activeCount = 0;
      } else {
        refuse(batch.clearSeq !== null && batch.restoreSeq === null &&
          event.actor === batch.restored_by,
          'restore without an earlier, matching clearing');
        for (const member of batch.members) {
          refuse(states.get(member) === false, 'restoring an active member');
          states.set(member, true);
        }
        batch.restoreSeq = sequence;
        activeCount += batch.members.length;
      }
    }
    refuse(placeCount === items.length, 'place receipt count differs from items');
    for (const batch of batches.values()) {
      refuse(batch.clearSeq !== null, 'batch has no clearing receipt');
      refuse((batch.restored_by === null) === (batch.restoreSeq === null),
        'batch restoration state differs from receipts');
    }
    refuse(safeCount(activeCount, 0, items.length), 'impossible active count');
    for (const item of items) {
      refuse(item.active === (states.get(item.item_id) ? 1 : 0),
        'stored active flag differs from clearing history');
    }
  }
}
