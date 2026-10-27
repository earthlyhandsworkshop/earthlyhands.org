// Invented identities, items and isolated temporary SQLite stores for tests only.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SqliteBenchSurfaceStore } from './bench-surface-sqlite.mjs';
export const workshop = { kind: 'workshop' };
export const alice = { authenticated: true, workshopMember: true, principalId: 'alice' };
export const bob = { authenticated: true, workshopMember: true, principalId: 'bob' };
export const guest = { authenticated: false, principalId: 'visitor' };
export const item = (i, access = workshop) => ({ itemId: 'leaf-' + i, sourceId: 'source-' + i,
  access, warningIds: i === 7 ? ['unresolved-warning-7'] : [] });
export const ids = Array.from({ length: 14 }, (_, i) => 'leaf-' + (i + 1));
export function setup(t, benchAccess = workshop) {
  const dir = mkdtempSync(join(tmpdir(), 'workbench-sqlite-'));
  const path = join(dir, 'bench.sqlite');
  const db = new SqliteBenchSurfaceStore(path);
  t.after(() => { db.close(); rmSync(dir, { recursive: true, force: true }); });
  db.createBench('old-growth', benchAccess);
  return { db, path };
}
export function populate(db, count = 14, actor = alice, a = workshop) {
  let gen = db.readActive('old-growth', actor).generation;
  for (let i = 1; i <= count; i++) gen = db.place('old-growth', item(i, a), actor, gen, 'place-' + i);
  return gen;
}
