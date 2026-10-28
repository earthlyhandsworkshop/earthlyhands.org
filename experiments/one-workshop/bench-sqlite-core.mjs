// Test-fixture identity and transaction boundaries; NOT real authentication.
const KINDS = new Set(['public', 'workshop', 'private', 'bello-player']);
const obj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
export const id = x => typeof x === 'string' && /^[A-Za-z0-9_.:-]{1,120}$/.test(x);
export function requireId(x, what) { if (!id(x)) throw new Error('Invalid ' + what); }
export function access(a) {
  if (!obj(a) || !KINDS.has(a.kind)) throw new Error('Invalid access');
  if (a.kind === 'private') requireId(a.ownerId, 'private owner');
  if (a.kind === 'bello-player') {
    requireId(a.ownerId, 'Bello player'); requireId(a.matchId, 'Bello match');
  }
  if (['public', 'workshop'].includes(a.kind) && (a.ownerId !== undefined || a.matchId !== undefined))
    throw new Error('Unexpected owner or match');
  if (a.kind === 'private' && a.matchId !== undefined) throw new Error('Unexpected private match');
  // Versioned v0 compartments have no extension keys. If a snapshot hides
  // unrecognized access hints beside the canonical fields, accessKey()
  // would otherwise silently ignore them. Never carry ambiguous permission
  // instructions into a later runtime that might interpret those hints.
  const keys = new Set(Object.keys(a));
  const permitted = a.kind === 'bello-player'
    ? ['kind', 'ownerId', 'matchId']
    : a.kind === 'private' ? ['kind', 'ownerId'] : ['kind'];
  if (keys.size !== permitted.length || permitted.some(key => !keys.has(key)))
    throw new Error('Unexpected access metadata fields');
}
export function accessKey(a) { access(a); return JSON.stringify([a.kind, a.ownerId ?? '', a.matchId ?? '']); }
function canView(a, viewer) {
  if (!obj(viewer) || viewer.authenticated !== true) return false;
  if (a.kind === 'public' || a.kind === 'workshop') return viewer.workshopMember === true;
  if (a.kind === 'private') return viewer.principalId === a.ownerId;
  return viewer.principalId === a.ownerId && viewer.matchId === a.matchId;
}
export function validateItem(item, benchAccess) {
  if (!obj(item)) throw new Error('Invalid item');
  requireId(item.itemId, 'item ID'); requireId(item.sourceId, 'source pointer');
  if (accessKey(item.access) !== accessKey(benchAccess)) throw new Error('Item access does not match bench');
  if (!Array.isArray(item.warningIds) || item.warningIds.length > 40 ||
      !item.warningIds.every(id) || new Set(item.warningIds).size !== item.warningIds.length)
    throw new Error('Invalid warning pointers');
}
export function validatePage(after, limit) {
  if (!Number.isSafeInteger(after) || after < 0 ||
      !Number.isSafeInteger(limit) || limit < 1 || limit > 100)
    throw new Error('Invalid trace page');
}
export function createBench(db, benchId, benchAccess) {
  // Privileged local fixture setup, not a public create endpoint.
  requireId(benchId, 'bench ID'); access(benchAccess);
  db.prepare('INSERT OR IGNORE INTO benches(bench_id,access_json,generation) VALUES(?,?,0)')
    .run(benchId, JSON.stringify(benchAccess));
  const existing = db.prepare('SELECT access_json FROM benches WHERE bench_id=?').get(benchId);
  if (accessKey(JSON.parse(existing.access_json)) !== accessKey(benchAccess))
    throw new Error('Bench access cannot be replaced');
}
export function authorizedRead(db, benchId, viewer, project) {
  requireId(benchId, 'bench ID');
  // Pin generation and rows to one read snapshot even if another writer clears.
  db.exec('BEGIN');
  try {
    const row = db.prepare('SELECT generation,access_json FROM benches WHERE bench_id=?').get(benchId);
    const result = !row || !canView(JSON.parse(row.access_json), viewer) ? null : project(row);
    db.exec('COMMIT');
    return result;
  } catch (err) { db.exec('ROLLBACK'); throw err; }
}
export function mutate(db, benchId, actor, expectedGeneration, eventId, kind, apply) {
  requireId(benchId, 'bench ID'); requireId(eventId, 'event ID');
  if (!Number.isSafeInteger(expectedGeneration) || expectedGeneration < 0)
    throw new Error('Invalid expected generation');
  db.exec('BEGIN IMMEDIATE');
  try {
    const row = db.prepare('SELECT generation,access_json FROM benches WHERE bench_id=?').get(benchId);
    const a = row && JSON.parse(row.access_json);
    if (!a || !canView(a, actor) || actor.workshopMember !== true || !id(actor.principalId))
      throw new Error('Tidy permission not established');
    if (row.generation !== expectedGeneration) throw new Error('Stale bench generation');
    const result = apply(a);
    const next = db.prepare('UPDATE benches SET generation=generation+1 WHERE bench_id=? AND generation=?')
      .run(benchId, expectedGeneration);
    if (next.changes !== 1) throw new Error('Stale bench generation');
    // v1 names the exact arriving item in the SAME transaction as its
    // placement. v0 remains byte-for-byte compatible and cannot claim this.
    const version = db.prepare('PRAGMA user_version').get().user_version;
    if (version === 1) {
      const arriving = kind === 'place' ? result.placedItemId : null;
      if ((kind === 'place' && !id(arriving)) ||
          (kind !== 'place' && arriving !== null))
        throw new Error('Chronology v1 requires exact placement identity');
      db.prepare(`INSERT INTO events(bench_id,seq,event_id,kind,actor,batch_id,item_count,placed_item_id)
        VALUES(?,?,?,?,?,?,?,?)`).run(benchId, expectedGeneration + 1, eventId, kind,
          actor.principalId, result.batchId ?? null, result.count, arriving);
    } else if (version === 0) {
      db.prepare(`INSERT INTO events(bench_id,seq,event_id,kind,actor,batch_id,item_count)
        VALUES(?,?,?,?,?,?,?)`).run(benchId, expectedGeneration + 1, eventId, kind,
          actor.principalId, result.batchId ?? null, result.count);
    } else throw new Error('Unsupported Workbench chronology schema');
    db.exec('COMMIT');
    return expectedGeneration + 1;
  } catch (err) { db.exec('ROLLBACK'); throw err; }
}
