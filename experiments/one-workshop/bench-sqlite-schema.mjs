// Indexed, local-only SQLite schema for fictional Workbench surface locators.
import { DatabaseSync } from 'node:sqlite';
export function openDb(filename) {
  const db = new DatabaseSync(filename);
  db.exec(\`PRAGMA busy_timeout=5000;
    PRAGMA journal_mode=WAL;
    PRAGMA synchronous=FULL;
    PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS benches (
      bench_id TEXT PRIMARY KEY, access_json TEXT NOT NULL, generation INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS items (
      bench_id TEXT NOT NULL, item_id TEXT NOT NULL, source_id TEXT NOT NULL,
      access_json TEXT NOT NULL, warning_ids_json TEXT NOT NULL, active INTEGER NOT NULL,
      PRIMARY KEY(bench_id,item_id), FOREIGN KEY(bench_id) REFERENCES benches(bench_id)
    );
    CREATE INDEX IF NOT EXISTS items_active ON items(bench_id,active,item_id);
    CREATE TABLE IF NOT EXISTS batches (
      bench_id TEXT NOT NULL, batch_id TEXT NOT NULL, cleared_by TEXT NOT NULL,
      restored_by TEXT, PRIMARY KEY(bench_id,batch_id),
      FOREIGN KEY(bench_id) REFERENCES benches(bench_id)
    );
    CREATE TABLE IF NOT EXISTS batch_items (
      bench_id TEXT NOT NULL, batch_id TEXT NOT NULL, item_id TEXT NOT NULL,
      ordinal INTEGER NOT NULL, PRIMARY KEY(bench_id,batch_id,item_id),
      FOREIGN KEY(bench_id,batch_id) REFERENCES batches(bench_id,batch_id),
      FOREIGN KEY(bench_id,item_id) REFERENCES items(bench_id,item_id)
    );
    CREATE TABLE IF NOT EXISTS events (
      bench_id TEXT NOT NULL, seq INTEGER NOT NULL, event_id TEXT NOT NULL,
      kind TEXT NOT NULL, actor TEXT NOT NULL, batch_id TEXT, item_count INTEGER NOT NULL,
      PRIMARY KEY(bench_id,seq), UNIQUE(bench_id,event_id),
      FOREIGN KEY(bench_id) REFERENCES benches(bench_id)
    );
    CREATE INDEX IF NOT EXISTS events_notices ON events(bench_id,kind,seq);\`);
  return db;
}
