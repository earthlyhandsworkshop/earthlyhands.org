// Local-only, fictional locator catalog. It persists source-span receipts,
// NOT source bodies, original evidence, permissions, or publication approval.
// Every principal/access assertion below is an untrusted TEST FIXTURE.
import { DatabaseSync } from 'node:sqlite';
import { access, id } from './bench-sqlite-core.mjs';
import { readSourceSpan } from './source-span.mjs';

const mayView = (a, v) => {
  if (!v || typeof v !== 'object' || v.authenticated !== true) return false;
  if (a.kind === 'workshop') return v.workshopMember === true;
  if (a.kind === 'private') return v.principalId === a.ownerId;
  if (a.kind === 'bello-player') return v.principalId === a.ownerId && v.matchId === a.matchId;
  return false; // Deliberately NO public-publishing route in this catalog.
};
// The receipt's ID grammar admits 128 characters; actor IDs in the shared
// bench helper have a narrower 120-character limit. Do not conflate them.
const exactSpanId = x => typeof x === 'string' &&
  /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(x);
const principal = v => v && id(v.principalId) ? v.principalId : null;
const match = v => v && id(v.matchId) ? v.matchId : null;
const membership = v => v && v.workshopMember === true ? 1 : 0;
const viewClause = `((scope_kind='workshop' AND ?=1) OR
  (scope_kind='private' AND owner_id=?) OR
  (scope_kind='bello-player' AND owner_id=? AND match_id=?))`;

export class SourceSpanCatalog {
  constructor(filename) {
    this.db = new DatabaseSync(filename);
    this.db.exec(`PRAGMA busy_timeout=5000;
      PRAGMA journal_mode=WAL;
      PRAGMA synchronous=FULL;
      CREATE TABLE IF NOT EXISTS source_span_catalog (
        span_id TEXT PRIMARY KEY, parent_file_id TEXT NOT NULL,
        parent_revision TEXT NOT NULL, parent_digest TEXT NOT NULL,
        record_json TEXT NOT NULL, scope_kind TEXT NOT NULL,
        owner_id TEXT, match_id TEXT, claimed_registrar TEXT NOT NULL,
        CHECK (scope_kind IN ('workshop','private','bello-player')),
        CHECK ((scope_kind='workshop' AND owner_id IS NULL AND match_id IS NULL) OR
          (scope_kind='private' AND owner_id IS NOT NULL AND match_id IS NULL) OR
          (scope_kind='bello-player' AND owner_id IS NOT NULL AND match_id IS NOT NULL))
      );
      CREATE INDEX IF NOT EXISTS source_span_parent_idx ON
        source_span_catalog(parent_file_id,parent_revision,span_id);`);
  }

  register(record, snapshot, scope, actor) {
    access(scope);
    if (scope.kind === 'public') throw new Error('Publication is not a catalog permission');
    if (!principal(actor) || actor.authenticated !== true ||
        actor.workshopMember !== true || !mayView(scope,actor))
      throw new Error('Claimed contributor is not authorized for this fixture scope');
    // The passage must agree with the exact complete parent at deposition.
    // No assertion that the actual source or actor has been authenticated.
    readSourceSpan(record,snapshot);
    const db=this.db;
    db.exec('BEGIN IMMEDIATE');
    try {
      // Keep one source-body digest per parent ID + revision in this catalog.
      // The check shares INSERT's write transaction, so competing connections
      // cannot endorse conflicting bytes under the same pinned revision.
      // It also checks preexisting v0 rows without a schema migration.
      const conflicting=db.prepare(`SELECT span_id FROM source_span_catalog
        WHERE parent_file_id=? AND parent_revision=? AND parent_digest<>?
        LIMIT 1`).get(record.parent.fileId,record.parent.revision,
          record.parent.bodyDigest);
      if (conflicting) throw new Error('Conflicting pinned parent revision');
      db.prepare(`INSERT INTO source_span_catalog
        (span_id,parent_file_id,parent_revision,parent_digest,record_json,
         scope_kind,owner_id,match_id,claimed_registrar)
        VALUES(?,?,?,?,?,?,?,?,?)`).run(
          record.id, record.parent.fileId, record.parent.revision,
          record.parent.bodyDigest, JSON.stringify(record), scope.kind,
          scope.ownerId ?? null, scope.matchId ?? null, actor.principalId);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
    return { spanId:record.id, parentFileId:record.parent.fileId,
      parentRevision:record.parent.revision, status:'indexed-only' };
  }

  // Missing and inaccessible IDs both return null. No hidden source pointer,
  // revision, count, or failure reason is returned before the scope gate.
  read(spanId, viewer, exactSnapshot) {
    if (!exactSpanId(spanId)) throw new Error('Invalid source-span ID');
    if (!viewer || viewer.authenticated !== true) return null;
    const row=this.db.prepare(`SELECT record_json,claimed_registrar FROM source_span_catalog
      WHERE span_id=? AND ${viewClause}`).get(
        spanId,membership(viewer),principal(viewer),principal(viewer),match(viewer));
    if (!row) return null;
    // The caller must still present the exact pinned body. No nearest-link or
    // silent reanchor, and no claim of authenticated original-source custody.
    const result=readSourceSpan(JSON.parse(row.record_json),exactSnapshot);
    return { ...result, claimedRegistrar:row.claimed_registrar,
      catalogStatus:'indexed-only' };
  }

  listVisible(viewer,limit=50) {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100)
      throw new Error('Invalid catalog page size');
    if (!viewer || viewer.authenticated !== true) return [];
    // Gate by scope BEFORE LIMIT: hidden alphabetically-earlier rows must not
    // crowd out visible records or disclose a hidden record count.
    return this.db.prepare(`SELECT span_id,parent_file_id,parent_revision
      FROM source_span_catalog WHERE ${viewClause}
      ORDER BY span_id LIMIT ?`).all(
        membership(viewer),principal(viewer),principal(viewer),match(viewer),limit)
      .map(r=>({spanId:r.span_id,parentFileId:r.parent_file_id,
        parentRevision:r.parent_revision}));
  }

  close() { this.db.close(); }
}
