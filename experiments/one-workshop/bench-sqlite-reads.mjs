import { requireId, authorizedRead, validatePage } from './bench-sqlite-core.mjs';
const unpack = x => ({ itemId: x.item_id, sourceId: x.source_id,
  access: JSON.parse(x.access_json), warningIds: JSON.parse(x.warning_ids_json) });
// All projections are scoped to one authorized bench and one SQLite read snapshot.
export function readActive(db, benchId, viewer) {
  return authorizedRead(db, benchId, viewer, row => ({
    benchId, generation: row.generation,
    activeItems: db.prepare(`SELECT item_id,source_id,access_json,warning_ids_json
      FROM items WHERE bench_id=? AND active=1 ORDER BY item_id`).all(benchId).map(unpack)
  }));
}
export function readBatch(db, benchId, batchId, viewer) {
  requireId(batchId, 'batch ID');
  return authorizedRead(db, benchId, viewer, () => {
    const b = db.prepare('SELECT cleared_by,restored_by FROM batches WHERE bench_id=? AND batch_id=?')
      .get(benchId, batchId);
    if (!b) return null;
    const items = db.prepare(`SELECT i.item_id,i.source_id,i.access_json,i.warning_ids_json
      FROM batch_items x JOIN items i ON i.bench_id=x.bench_id AND i.item_id=x.item_id
      WHERE x.bench_id=? AND x.batch_id=? ORDER BY x.ordinal`).all(benchId, batchId).map(unpack);
    return { batchId, clearedBy: b.cleared_by, restoredBy: b.restored_by,
      restored: b.restored_by !== null, items };
  });
}
const projectEvent = x => ({ sequence: x.seq, eventId: x.event_id, kind: x.kind,
  by: x.actor, batchId: x.batch_id, itemCount: x.item_count });
export function readTrace(db, benchId, viewer, { after = 0, limit = 50 } = {}) {
  validatePage(after, limit);
  return authorizedRead(db, benchId, viewer, () => db.prepare(`SELECT seq,event_id,kind,actor,batch_id,item_count
    FROM events WHERE bench_id=? AND seq>? ORDER BY seq LIMIT ?`)
    .all(benchId, after, limit).map(projectEvent));
}
export function readNoticeSuggestions(db, benchId, viewer, { after = 0, limit = 50 } = {}) {
  validatePage(after, limit);
  return authorizedRead(db, benchId, viewer, () => db.prepare(`SELECT seq,event_id,kind,actor,batch_id,item_count
    FROM events WHERE bench_id=? AND kind IN ('clear','restore') AND seq>? ORDER BY seq LIMIT ?`)
    .all(benchId, after, limit).map(x => ({ ...projectEvent(x), delivery: 'not-sent' })));
}
