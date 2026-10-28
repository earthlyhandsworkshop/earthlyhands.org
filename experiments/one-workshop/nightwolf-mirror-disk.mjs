// Fictional Nightwolf mirror persisted to one local SQLite file.
// This is NOT a login system, real authorization, encryption, a Cloudflare
// connection, or a safe way to expose private data to a network or visitors.
import { DatabaseSync } from 'node:sqlite';
import { receiveMirror, visibleEvents } from './nightwolf-mirror.mjs';

export class NightwolfMirrorDisk {
  #db;
  constructor(filename) {
    this.#db = new DatabaseSync(filename);
    // A closed SQLite file can be copied in these tests. Do not copy an open
    // production database; no off-machine backup protocol is supplied here.
    this.#db.exec(`
      PRAGMA busy_timeout = 5000;
      PRAGMA journal_mode = DELETE;
      PRAGMA synchronous = FULL;
      CREATE TABLE IF NOT EXISTS mirror_state (
        singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
        generation INTEGER NOT NULL CHECK (generation >= 1),
        digest TEXT NOT NULL,
        envelope TEXT NOT NULL
      ) STRICT;
    `);
  }
  #current() {
    const row = this.#db.prepare(
      'SELECT generation, digest, envelope FROM mirror_state WHERE singleton = 1'
    ).get();
    if (!row) return null;
    let envelope;
    try { envelope = JSON.parse(row.envelope); }
    catch { throw new Error('Stored mirror JSON unreadable'); }
    // Recheck disk bytes before relying on an earlier state. This checks
    // consistency, not whether the author of those bytes was trustworthy.
    const checked = receiveMirror(null, envelope);
    if (checked.core.generation !== row.generation || checked.digest !== row.digest)
      throw new Error('Stored mirror row contradicts envelope');
    return checked;
  }
  summary() {
    const current = this.#current();
    return current ? { generation: current.core.generation, digest: current.digest } : null;
  }
  // Fixture-only projection: actorId is supplied by the caller and NOT
  // authenticated. Never expose this method as a remote authorization API.
  readForClaimedActor(actorId) {
    const current = this.#current();
    return current ? visibleEvents(current, actorId) : null;
  }
  receive(envelope) {
    this.#db.exec('BEGIN IMMEDIATE');
    try {
      const current = this.#current();
      const next = receiveMirror(current, envelope);
      const serialized = JSON.stringify(next);
      if (current) {
        const updated = this.#db.prepare(`
          UPDATE mirror_state SET generation = ?, digest = ?, envelope = ?
          WHERE singleton = 1 AND generation = ? AND digest = ?
        `).run(next.core.generation, next.digest, serialized,
          current.core.generation, current.digest);
        if (updated.changes !== 1) throw new Error('Stale disk generation');
      } else {
        this.#db.prepare(`
          INSERT INTO mirror_state (singleton, generation, digest, envelope)
          VALUES (1, ?, ?, ?)
        `).run(next.core.generation, next.digest, serialized);
      }
      this.#db.exec('COMMIT');
      return { generation: next.core.generation, digest: next.digest };
    } catch (error) {
      this.#db.exec('ROLLBACK');
      throw error;
    }
  }
  close() { this.#db.close(); }
}
