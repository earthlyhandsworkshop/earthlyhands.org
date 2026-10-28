// Opt-in fictional Workbench chronology v1. No migration of v0 receipts:
// a v0 place count cannot be promoted into a witnessed item identity.
// This is a local experiment, not a deployed identity or custody service.
import { SqliteBenchSurfaceStore } from './bench-surface-sqlite.mjs';
import { id } from './bench-sqlite-core.mjs';

export class ChronologyV1BenchStore extends SqliteBenchSurfaceStore {
  constructor(filename) {
    super(filename);
    const version = this.db.prepare('PRAGMA user_version').get().user_version;
    if (version === 0) {
      const count = this.db.prepare('SELECT COUNT(*) AS n FROM events').get().n;
      const items = this.db.prepare('SELECT COUNT(*) AS n FROM items').get().n;
      if (count || items) {
        this.close();
        throw new Error('Existing v0 history cannot be promoted to chronology v1');
      }
      this.db.exec('BEGIN IMMEDIATE');
      try {
        this.db.exec('ALTER TABLE events ADD COLUMN placed_item_id TEXT');
        this.db.exec('PRAGMA user_version=1');
        this.db.exec('COMMIT');
      } catch (error) {
        this.db.exec('ROLLBACK'); this.close(); throw error;
      }
    } else if (version !== 1 ||
      !this.db.prepare('PRAGMA table_info(events)').all().some(x => x.name === 'placed_item_id')) {
      this.close();
      throw new Error('Unsupported chronology v1 database');
    }
  }
}

// Full replay of arrival/clear/restore state. This proves internal consistency
// under a trusted v1 schema, not the identity of the actor or truth of history.
export function auditChronologyV1(db) {
  if (db.prepare('PRAGMA user_version').get().user_version !== 1)
    throw new Error('Chronology v1 required');
  const reject = detail => { throw new Error('Chronology v1 mismatch: ' + detail); };
  const benches = db.prepare('SELECT bench_id,generation FROM benches').all();
  for (const bench of benches) {
    const bid = bench.bench_id;
    const items = db.prepare('SELECT item_id,active FROM items WHERE bench_id=?').all(bid);
    const itemFlags = new Map(items.map(x => [x.item_id,x.active]));
    if (itemFlags.size !== items.length || items.some(x => !id(x.item_id) || ![0,1].includes(x.active)))
      reject('invalid items');
    const batchRows = db.prepare('SELECT batch_id,cleared_by,restored_by FROM batches WHERE bench_id=?').all(bid);
    const batches = new Map();
    for (const b of batchRows) {
      const members = db.prepare('SELECT item_id,ordinal FROM batch_items WHERE bench_id=? AND batch_id=? ORDER BY ordinal')
        .all(bid,b.batch_id);
      if (!id(b.batch_id) || !id(b.cleared_by) ||
          (b.restored_by !== null && !id(b.restored_by)) ||
          members.length < 1 || members.length > 500 ||
          members.some((m,i) => m.ordinal !== i || !itemFlags.has(m.item_id)) ||
          new Set(members.map(x=>x.item_id)).size !== members.length)
        reject('invalid clearing batch');
      batches.set(b.batch_id,{...b,members:members.map(x=>x.item_id),cleared:false,restored:false});
    }
    const seen = new Set(), active = new Set();
    const events = db.prepare('SELECT seq,event_id,kind,actor,batch_id,item_count,placed_item_id FROM events WHERE bench_id=? ORDER BY seq').all(bid);
    if (events.length !== bench.generation) reject('generation');
    for (let i=0;i<events.length;i++) {
      const e=events[i];
      if (e.seq !== i+1 || !id(e.event_id) || !id(e.actor)) reject('sequence or actor');
      if (e.kind === 'place') {
        if (e.batch_id !== null || e.item_count !== 1 || !id(e.placed_item_id) ||
            !itemFlags.has(e.placed_item_id) || seen.has(e.placed_item_id))
          reject('invalid or duplicate arrival');
        seen.add(e.placed_item_id);
        active.add(e.placed_item_id);
      } else {
        if (e.placed_item_id !== null || !batches.has(e.batch_id))
          reject('unrecognized batch or item identity');
        const b=batches.get(e.batch_id);
        if (e.item_count !== b.members.length) reject('receipt count');
        if (e.kind === 'clear') {
          if (b.cleared || e.actor !== b.cleared_by ||
              active.size !== b.members.length ||
              b.members.some(x => !active.has(x)))
            reject('clearing includes missing, future, or inactive items');
          for (const x of b.members) active.delete(x);
          b.cleared=true;
        } else if (e.kind === 'restore') {
          if (!b.cleared || b.restored || e.actor !== b.restored_by ||
              b.members.some(x=>active.has(x)))
            reject('restoration chronology');
          for (const x of b.members) active.add(x);
          b.restored=true;
        } else reject('event kind');
      }
    }
    if (seen.size !== itemFlags.size || [...itemFlags].some(([x,flag])=>Number(active.has(x)) !== flag))
      reject('final item state');
    for (const b of batches.values())
      if (!b.cleared || b.restored !== (b.restored_by !== null))
        reject('batch completion');
  }
  return true;
}
