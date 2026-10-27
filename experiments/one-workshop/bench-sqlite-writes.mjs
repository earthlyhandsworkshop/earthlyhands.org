import { requireId, id, validateItem, mutate } from './bench-sqlite-core.mjs';
// Every operation is one SQLite transaction; a failed step rolls back all changes.
export function place(db, benchId, item, actor, expected, eventId) {
  return mutate(db, benchId, actor, expected, eventId, 'place', benchAccess => {
    validateItem(item, benchAccess);
    db.prepare(`INSERT INTO items(bench_id,item_id,source_id,access_json,warning_ids_json,active)
      VALUES(?,?,?,?,?,1)`).run(benchId, item.itemId, item.sourceId,
        JSON.stringify(item.access), JSON.stringify(item.warningIds));
    return { count: 1 };
  });
}
export function clear(db, benchId, batchId, itemIds, actor, expected, eventId) {
  requireId(batchId, 'batch ID');
  if (!Array.isArray(itemIds) || itemIds.length < 1 || itemIds.length > 500 ||
      !itemIds.every(id) || new Set(itemIds).size !== itemIds.length)
    throw new Error('Invalid exact clearing list');
  return mutate(db, benchId, actor, expected, eventId, 'clear', () => {
    const active = db.prepare('SELECT item_id FROM items WHERE bench_id=? AND active=1')
      .all(benchId).map(x => x.item_id);
    const wanted = new Set(itemIds);
    if (active.length !== itemIds.length || active.some(x => !wanted.has(x)))
      throw new Error('Clear must name exactly the current bench items');
    db.prepare('INSERT INTO batches(bench_id,batch_id,cleared_by) VALUES(?,?,?)')
      .run(benchId, batchId, actor.principalId);
    const put = db.prepare(`INSERT INTO batch_items(bench_id,batch_id,item_id,ordinal)
      VALUES(?,?,?,?)`);
    for (let i = 0; i < itemIds.length; i++) put.run(benchId, batchId, itemIds[i], i);
    db.prepare('UPDATE items SET active=0 WHERE bench_id=? AND active=1').run(benchId);
    return { batchId, count: itemIds.length };
  });
}
export function restore(db, benchId, batchId, actor, expected, eventId) {
  requireId(batchId, 'batch ID');
  return mutate(db, benchId, actor, expected, eventId, 'restore', () => {
    const batch = db.prepare('SELECT restored_by FROM batches WHERE bench_id=? AND batch_id=?')
      .get(benchId, batchId);
    if (!batch || batch.restored_by !== null) throw new Error('Unknown or already restored batch');
    const items = db.prepare(`SELECT i.item_id,i.active FROM batch_items b
      JOIN items i ON i.bench_id=b.bench_id AND i.item_id=b.item_id
      WHERE b.bench_id=? AND b.batch_id=? ORDER BY b.ordinal`).all(benchId, batchId);
    if (!items.length || items.some(x => x.active !== 0))
      throw new Error('Restore would overwrite active work');
    const changed = db.prepare(`UPDATE items SET active=1 WHERE bench_id=? AND item_id IN
      (SELECT item_id FROM batch_items WHERE bench_id=? AND batch_id=?)`)
      .run(benchId, benchId, batchId);
    if (changed.changes !== items.length) throw new Error('Restore item count mismatch');
    db.prepare('UPDATE batches SET restored_by=? WHERE bench_id=? AND batch_id=?')
      .run(actor.principalId, benchId, batchId);
    return { batchId, count: items.length };
  });
}
