// Fictional local Nightwolf mirror with a second, separately retained tip file.
// Neither file is an authenticated trust anchor, an ACL, encryption, or a
// crash-atomic two-file transaction. Never use this with real Workshop data.
import { existsSync, openSync, writeFileSync, fsyncSync, closeSync,
  renameSync, unlinkSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { NightwolfMirrorDisk } from './nightwolf-mirror-disk.mjs';

export const TIP_SCHEMA = 'earthlyhands.nightwolf.local-tip.fixture.v0';
const digestOk = s => typeof s === 'string' && /^[a-f0-9]{64}$/.test(s);

function readTip(path) {
  if (!existsSync(path)) return null;
  let tip;
  try { tip = JSON.parse(readFileSync(path, 'utf8')); }
  catch { throw new Error('Local tip unreadable'); }
  if (!tip || typeof tip !== 'object' || Array.isArray(tip) ||
      Object.keys(tip).sort().join(',') !== 'digest,generation,schema' ||
      tip.schema !== TIP_SCHEMA ||
      !Number.isSafeInteger(tip.generation) || tip.generation < 1 ||
      !digestOk(tip.digest))
    throw new Error('Invalid local tip');
  return tip;
}

function writeTip(path, summary) {
  const temp = path + '.' + randomUUID() + '.tmp';
  let fd;
  try {
    fd = openSync(temp, 'wx', 0o600);
    writeFileSync(fd, JSON.stringify({schema:TIP_SCHEMA,
      generation:summary.generation, digest:summary.digest}) + '\n');
    fsyncSync(fd);
    closeSync(fd);
    fd = undefined;
    renameSync(temp, path);
    // Best-effort local directory durability. This is not a power-loss proof.
    const dirFd = openSync(dirname(path), 'r');
    try { fsyncSync(dirFd); } finally { closeSync(dirFd); }
  } finally {
    if (fd !== undefined) closeSync(fd);
    if (existsSync(temp)) unlinkSync(temp);
  }
}

export class NightwolfMirrorWithTip {
  #disk;
  #tipPath;
  constructor(databasePath, tipPath) {
    if (typeof databasePath !== 'string' || typeof tipPath !== 'string' ||
        resolve(databasePath) === resolve(tipPath))
      throw new Error('Distinct database and tip paths required');
    this.#tipPath = tipPath;
    this.#disk = new NightwolfMirrorDisk(databasePath);
  }
  #checkedSummary() {
    const disk = this.#disk.summary();
    const tip = readTip(this.#tipPath);
    if (!disk && !tip) return null;
    // Missing or mismatched tips must NOT silently bless a replacement DB.
    if (!disk || !tip || disk.generation !== tip.generation ||
        disk.digest !== tip.digest)
      throw new Error('Local tip mismatch or missing: refuse rollback or unwitnessed state');
    return disk;
  }
  summary() { return this.#checkedSummary(); }
  readForClaimedActor(actorId) {
    const before = this.#checkedSummary();
    if (!before) return null;
    const events = this.#disk.readForClaimedActor(actorId);
    const after = this.#checkedSummary();
    if (after.generation !== before.generation || after.digest !== before.digest)
      throw new Error('Mirror advanced during local read');
    return events;
  }
  receive(envelope) {
    this.#checkedSummary();
    // SQLite commit precedes the separate tip update. If the tip write fails,
    // future operations refuse the mismatch; they never silently repair it.
    const result = this.#disk.receive(envelope);
    try { writeTip(this.#tipPath, result); }
    catch (error) {
      throw new Error('SQLite committed but local tip did not advance; manual recovery required',
        { cause: error });
    }
    this.#checkedSummary();
    return result;
  }
  close() { this.#disk.close(); }
}
