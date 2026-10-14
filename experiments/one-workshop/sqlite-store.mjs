// Experimental local persistence adapter. Not an HTTP service or authorization layer.
// Requires Node >=22 with node:sqlite. It never handles real archival material.
import { DatabaseSync } from 'node:sqlite';
import { DOCUMENT_ID, newDocument, parseDocument, saveRevision, approveRevision } from './model.mjs';

export class VersionConflict extends Error {
  constructor() { super('Version conflict: another hand changed this sheet. Reload before retrying.'); this.name = 'VersionConflict'; }
}

export class SqliteDocumentStore {
  constructor(filename) {
    this.db = new DatabaseSync(filename);
    this.db.exec(`PRAGMA busy_timeout = 5000;
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS document (
        id TEXT PRIMARY KEY,
        generation INTEGER NOT NULL,
        working_state TEXT NOT NULL,
        published_revision INTEGER,
        published_text TEXT
      );`);
    this.db.prepare('INSERT OR IGNORE INTO document (id, generation, working_state) VALUES (?, 1, ?)')
      .run(DOCUMENT_ID, JSON.stringify(newDocument()));
  }

  readWorking() {
    // Trusted local caller only. Do not expose this method through a public endpoint.
    const row = this.db.prepare('SELECT generation, working_state FROM document WHERE id = ?').get(DOCUMENT_ID);
    if (!row) throw new Error('Document missing');
    return { generation: row.generation, document: parseDocument(row.working_state) };
  }

  readPublic() {
    // Restrict the SQL projection: draft content is never read to construct this response.
    const row = this.db.prepare('SELECT published_revision, published_text FROM document WHERE id = ?').get(DOCUMENT_ID);
    if (!row || row.published_revision === null) return null;
    return { id: DOCUMENT_ID, revision: row.published_revision, content: row.published_text };
  }

  #commit(expectedGeneration, edit) {
    if (!Number.isSafeInteger(expectedGeneration) || expectedGeneration < 1) throw new VersionConflict();
    const observed = this.readWorking();
    if (observed.generation !== expectedGeneration) throw new VersionConflict();
    const next = edit(observed.document);
    const publication = next.publication;
    // The SQL conditional is the authority, not the pre-read above. SQLite updates
    // one row atomically, including approval changes that do not advance draft revision.
    const result = this.db.prepare(`UPDATE document SET
      generation = generation + 1, working_state = ?,
      published_revision = ?, published_text = ?
      WHERE id = ? AND generation = ?`)
      .run(JSON.stringify(next), publication?.revision ?? null, publication?.content ?? null,
        DOCUMENT_ID, expectedGeneration);
    if (result.changes !== 1) throw new VersionConflict();
    return { generation: expectedGeneration + 1, document: next };
  }

  save(content, expectedGeneration) {
    return this.#commit(expectedGeneration, doc => saveRevision(doc, content, doc.working_revision));
  }

  approve(expectedGeneration) {
    return this.#commit(expectedGeneration, doc => approveRevision(doc, doc.working_revision));
  }

  close() { this.db.close(); }
}
