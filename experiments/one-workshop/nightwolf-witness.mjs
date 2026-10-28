// Fictional, local-only independent continuity witness for Nightwolf mirrors.
// No authenticated principal, remote service, protected disk, or signed receipts.
// The witness never receives document bodies, source objects, or private events.
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';

export const WITNESS_SCHEMA = 'earthlyhands.nightwolf.witness.fixture.v0';
const validId = x => typeof x === 'string' && /^[a-z][a-z0-9:_-]{1,79}$/.test(x);
const validDigest = x => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x);
const hash = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
function requireMirrorId(mirrorId) {
  if (!validId(mirrorId)) throw new Error('Invalid mirror ID');
}
function requireSummary(summary) {
  if (!summary || typeof summary !== 'object' || Array.isArray(summary) ||
      Object.keys(summary).sort().join(',') !== 'digest,generation' ||
      !Number.isSafeInteger(summary.generation) || summary.generation < 1 ||
      !validDigest(summary.digest)) throw new Error('Invalid mirror summary');
}
function receipt(mirrorId, generation, digest, previousDigest, previousReceipt) {
  return hash({schema:WITNESS_SCHEMA,mirrorId,generation,digest,previousDigest,previousReceipt});
}

export class NightwolfWitnessStore {
  #db;
  constructor(filename, {create=false, writable=create}={}) {
    if (!create && !existsSync(filename))
      throw new Error('Witness unavailable; explicit enrollment required');
    this.#db=new DatabaseSync(filename, {readOnly:!writable});
    try {
      this.#db.exec('PRAGMA busy_timeout=5000');
      if (create) {
        this.#db.exec('PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL; '
          + 'CREATE TABLE IF NOT EXISTS witness_events ('
          + 'mirror_id TEXT NOT NULL, generation INTEGER NOT NULL CHECK (generation >= 1), '
          + 'digest TEXT NOT NULL, previous_digest TEXT, previous_receipt TEXT, '
          + 'receipt TEXT NOT NULL, PRIMARY KEY (mirror_id, generation)) STRICT;');
      }
    } catch(error) { this.#db.close(); throw error; }
  }
  #latest(mirrorId) {
    requireMirrorId(mirrorId);
    const rows=this.#db.prepare('SELECT generation,digest,previous_digest,previous_receipt,receipt '
      + 'FROM witness_events WHERE mirror_id=? ORDER BY generation ASC').all(mirrorId);
    let previous=null;
    for (const row of rows) {
      if (!Number.isSafeInteger(row.generation) ||
          row.generation !== (previous?.generation ?? 0)+1 ||
          !validDigest(row.digest) ||
          row.previous_digest !== (previous?.digest ?? null) ||
          row.previous_receipt !== (previous?.receipt ?? null) ||
          row.receipt !== receipt(mirrorId,row.generation,row.digest,
            row.previous_digest,row.previous_receipt))
        throw new Error('Witness chronology invalid');
      previous=row;
    }
    return previous;
  }
  // Enrollment is explicit, only for an empty named mirror, and only at
  // generation 1. A missing witness is NEVER silently initialized on verify.
  enroll(mirrorId,summary) {
    requireMirrorId(mirrorId); requireSummary(summary);
    if (summary.generation !== 1) throw new Error('Enrollment requires generation 1');
    return this.#append('enroll',mirrorId,summary,null);
  }
  advance(mirrorId,summary,previousDigest) {
    requireMirrorId(mirrorId); requireSummary(summary);
    if (!validDigest(previousDigest)) throw new Error('Invalid previous digest');
    return this.#append('advance',mirrorId,summary,previousDigest);
  }
  #append(mode,mirrorId,summary,previousDigest) {
    this.#db.exec('BEGIN IMMEDIATE');
    try {
      const latest=this.#latest(mirrorId);
      if (mode==='enroll') {
        if (latest) throw new Error('Mirror already enrolled');
      } else if (!latest || summary.generation !== latest.generation+1 ||
                 previousDigest !== latest.digest) {
        throw new Error('Witness refused rollback, fork, or missing predecessor');
      }
      const previousReceipt=latest?.receipt ?? null;
      const next={generation:summary.generation,digest:summary.digest,
        previous_digest:previousDigest,previous_receipt:previousReceipt,
        receipt:receipt(mirrorId,summary.generation,summary.digest,
          previousDigest,previousReceipt)};
      this.#db.prepare('INSERT INTO witness_events '
        + '(mirror_id,generation,digest,previous_digest,previous_receipt,receipt) '
        + 'VALUES (?,?,?,?,?,?)').run(mirrorId,next.generation,next.digest,
          next.previous_digest,next.previous_receipt,next.receipt);
      this.#db.exec('COMMIT');
      return {mirrorId,generation:next.generation,digest:next.digest,
        receipt:next.receipt};
    } catch(error) { this.#db.exec('ROLLBACK'); throw error; }
  }
  check(mirrorId,summary) {
    requireMirrorId(mirrorId); requireSummary(summary);
    const latest=this.#latest(mirrorId);
    if (!latest) throw new Error('Mirror not enrolled with witness');
    if (latest.generation !== summary.generation || latest.digest !== summary.digest)
      throw new Error('Witness mismatch: rollback, fork, or unwitnessed advance');
    return {mirrorId,generation:latest.generation,digest:latest.digest,
      receipt:latest.receipt};
  }
  latest(mirrorId) {
    const row=this.#latest(mirrorId);
    return row ? {mirrorId,generation:row.generation,digest:row.digest,
      receipt:row.receipt} : null;
  }
  close() { this.#db.close(); }
}
