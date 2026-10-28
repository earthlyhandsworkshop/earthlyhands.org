// Fictional Nightwolf read/advance gate backed by a separate local process.
// No authenticated RPC, source permission, service identity, or OS isolation.
// Other callers can still bypass this wrapper and open the underlying SQLite.
import { spawnSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NightwolfMirrorWithTip } from './nightwolf-mirror-tip.mjs';

const CLI=fileURLToPath(new URL('./nightwolf-witness-cli.mjs',import.meta.url));

// The witness is optional, but must not accidentally be the mirror database
// or local tip in disguise. This is an initial configuration check only:
// it cannot prevent a privileged actor replacing paths after construction,
// nor does it supply a separate security principal or filesystem.
function checkDistinctWitness(databasePath, tipPath, witnessFile) {
  if (![databasePath,tipPath,witnessFile].every(
    path => typeof path === 'string' && path.length > 0))
    throw new Error('Mirror, tip, and witness require three file paths');
  const witnessResolved=resolve(witnessFile);
  if ([databasePath,tipPath].some(path => resolve(path)===witnessResolved))
    throw new Error('Independent witness requires a distinct file from mirror and tip');
  if (existsSync(witnessFile)) {
    const witnessStat=statSync(witnessFile);
    for (const path of [databasePath,tipPath]) {
      if (!existsSync(path)) continue;
      const stat=statSync(path);
      if (witnessStat.dev===stat.dev && witnessStat.ino===stat.ino)
        throw new Error('Independent witness requires a distinct file from mirror and tip');
    }
  }
}

export class NightwolfWitnessedMirror {
  #mirror;
  #witnessFile;
  #mirrorId;
  constructor(databasePath,tipPath,witnessFile,mirrorId) {
    checkDistinctWitness(databasePath,tipPath,witnessFile);
    this.#mirror=new NightwolfMirrorWithTip(databasePath,tipPath);
    this.#witnessFile=witnessFile;
    this.#mirrorId=mirrorId;
  }
  #ask(verb, request) {
    // Only summary digests cross this process boundary. This is a fixture
    // transport, not a credential-bearing connection or a security sandbox.
    const result=spawnSync(process.execPath,[CLI,this.#witnessFile,verb],
      {input:JSON.stringify({mirrorId:this.#mirrorId,...request}),
        encoding:'utf8',timeout:15000,windowsHide:true});
    if (result.error || result.status !== 0) {
      throw new Error('Independent witness refused: '+
        (result.error?.message ?? result.stderr.trim() ?? 'unknown error'));
    }
    return JSON.parse(result.stdout).result;
  }
  summary() {
    const current=this.#mirror.summary();
    if (!current) throw new Error('Mirror empty: explicit witness enrollment required');
    this.#ask('check',{summary:current});
    return current;
  }
  readForClaimedActor(actorId) {
    const before=this.summary();
    const result=this.#mirror.readForClaimedActor(actorId);
    const after=this.summary();
    if (after.generation!==before.generation || after.digest!==before.digest)
      throw new Error('Mirror changed during witnessed read');
    return result;
  }
  receive(envelope) {
    const previous=this.summary();
    // The underlying mirror accepts appended batches. This witness records
    // exactly one generation per receipt, so reject skips BEFORE SQLite
    // changes: otherwise a valid batch would brick future guarded reads.
    if (envelope?.core?.generation !== previous.generation+1)
      throw new Error('Witnessed fixture requires exactly one new generation per receive; no local commit');
    // The mirror+tip commits first. If the witness refuses, no automatic
    // repair is attempted; future witnessed reads refuse the mismatch.
    const next=this.#mirror.receive(envelope);
    try {
      this.#ask('advance',{summary:next,previousDigest:previous.digest});
    } catch(error) {
      throw new Error('Mirror committed but independent witness did not accept it; review required',
        {cause:error});
    }
    this.summary();
    return next;
  }
  close() { this.#mirror.close(); }
}
