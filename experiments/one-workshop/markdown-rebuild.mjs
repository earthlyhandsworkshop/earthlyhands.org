// Fictional Markdown-first, read-only rebuild experiment. Not a rights service.
import { readFileSync, readdirSync, lstatSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

export const RECORD_SCHEMA = 'earthlyhands.markdown-carrier.fixture.v0';
const exact = (x, keys) => x && typeof x === 'object' && !Array.isArray(x) &&
  Object.keys(x).sort().join(',') === keys.slice().sort().join(',');
const sha = b => createHash('sha256').update(b).digest('hex');
const idOk = x => typeof x === 'string' && /^[a-z][a-z0-9-]{0,79}$/.test(x);
const digestOk = x => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x);
const ensureFile = path => {
  const s = lstatSync(path);
  if (!s.isFile() || s.isSymbolicLink()) throw new Error('Only regular carrier files accepted');
};
const ensureDirectory = path => {
  const s = lstatSync(path);
  if (!s.isDirectory() || s.isSymbolicLink()) throw new Error('Only regular carrier directories accepted');
};

// Every revision is a real, independently readable .md, not a database cell.
// Sidecar contains *claims*, never a verified grant of publication rights.
export function readCarrier(root, folder) {
  if (!idOk(folder)) throw new Error('Invalid carrier folder');
  const base = join(root, folder);
  ensureDirectory(base);
  const sidecarPath = join(base, 'record.json');
  ensureFile(sidecarPath);
  const meta = JSON.parse(readFileSync(sidecarPath, 'utf8'));
  if (!exact(meta, ['schema','id','sourceClaim','rightsState','revisions','publication']) ||
      meta.schema !== RECORD_SCHEMA || meta.id !== folder ||
      typeof meta.sourceClaim !== 'string' || !meta.sourceClaim.trim() ||
      !['unknown','affirmed','denied'].includes(meta.rightsState) ||
      !Array.isArray(meta.revisions) || meta.revisions.length < 1 ||
      meta.revisions.length > 1000) throw new Error('Unsupported Markdown sidecar');
  const revisionDir = join(base, 'revisions');
  ensureDirectory(revisionDir);
  const actualNames = readdirSync(revisionDir).sort();
  const expectedNames = [];
  const revisions = meta.revisions.map((r, i) => {
    const revision = i + 1;
    const name = String(revision).padStart(4,'0') + '.md';
    expectedNames.push(name);
    if (!exact(r,['revision','bytes','sha256']) || r.revision !== revision ||
        !Number.isSafeInteger(r.bytes) || r.bytes < 0 || !digestOk(r.sha256))
      throw new Error('Unsupported Markdown revision receipt');
    const path = join(revisionDir,name);
    ensureFile(path);
    const bytes = readFileSync(path);
    if (bytes.length !== r.bytes || sha(bytes) !== r.sha256)
      throw new Error('Markdown bytes disagree with receipt');
    // Exact UTF-8 roundtrip; invalid text must not be normalized and indexed.
    const text = bytes.toString('utf8');
    if (!Buffer.from(text,'utf8').equals(bytes)) throw new Error('Non-UTF8 Markdown');
    return { revision, bytes: r.bytes, sha256: r.sha256, text };
  });
  if (actualNames.join('\n') !== expectedNames.sort().join('\n'))
    throw new Error('Unreceipted Markdown revision present');
  const p = meta.publication;
  if (p !== null && (!exact(p,['revision','approvalClaim']) ||
      !Number.isSafeInteger(p.revision) || p.revision < 1 ||
      p.revision > revisions.length || typeof p.approvalClaim !== 'string' ||
      !p.approvalClaim.trim())) throw new Error('Unsupported publication receipt');
  return { id: folder, sourceClaim: meta.sourceClaim, rightsState: meta.rightsState,
    revisions, publication: p };
}

export function rebuildIndex(root, dbPath) {
  ensureDirectory(root);
  const folders = readdirSync(root).sort();
  // Complete preflight *before* changing the derived database.
  const carriers = folders.map(name => readCarrier(root,name));
  const db = new DatabaseSync(dbPath);
  try {
    db.exec(`PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS carrier_index (
        id TEXT PRIMARY KEY, source_claim TEXT NOT NULL, rights_state TEXT NOT NULL,
        latest_revision INTEGER NOT NULL, latest_sha256 TEXT NOT NULL,
        public_revision INTEGER, public_text TEXT
      ) STRICT;`);
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec('DELETE FROM carrier_index');
      const insert = db.prepare(`INSERT INTO carrier_index
        (id,source_claim,rights_state,latest_revision,latest_sha256,public_revision,public_text)
        VALUES (?,?,?,?,?,?,?)`);
      for (const c of carriers) {
        // Only a fixture projection: real publication requires independent ACL
        // and approval verification. Unknown rights never produce public text.
        const p = c.rightsState === 'affirmed' ? c.publication : null;
        insert.run(c.id,c.sourceClaim,c.rightsState,c.revisions.length,
          c.revisions.at(-1).sha256,p?.revision ?? null,
          p ? c.revisions[p.revision - 1].text : null);
      }
      db.exec('COMMIT');
    } catch(e) { db.exec('ROLLBACK'); throw e; }
    return { indexed: carriers.length, revisions: carriers.reduce((n,c)=>n+c.revisions.length,0) };
  } finally { db.close(); }
}

export function readDerivedIndex(dbPath) {
  const db = new DatabaseSync(dbPath, {readOnly:true});
  try { return db.prepare('SELECT * FROM carrier_index ORDER BY id').all(); }
  finally { db.close(); }
}
