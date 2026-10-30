// Witnessed read/write fixture: still local and unauthenticated.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, copyFileSync, unlinkSync, chmodSync, linkSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { MIRROR_SCHEMA, sealMirror } from './nightwolf-mirror.mjs';
import { NightwolfMirrorWithTip } from './nightwolf-mirror-tip.mjs';
import { NightwolfWitnessedMirror } from './nightwolf-witness-gate.mjs';

const CLI=fileURLToPath(new URL('./nightwolf-witness-cli.mjs',import.meta.url));
const id='nightwolf-fixture';
const bytes=Buffer.from('invented').toString('base64');
const sha256=createHash('sha256').update('invented').digest('hex');
function core(...bodies) {
  return {schema:MIRROR_SCHEMA,generation:bodies.length,
    actors:[{id:'ten',kind:'human',name:'Ten'},
      {id:'codex',kind:'companion',name:'Codex'}],
    objects:[{id:'leaf',bytes,sha256}],
    events:bodies.map((body,i)=>({seq:i+1,eventId:'e:'+String(i+1),
      actorId:i===0?'ten':'codex',objectId:'leaf',
      scope:i===0?'private:ten':'workshop',body}))};
}
function paths(t) {
  const dir=mkdtempSync(join(tmpdir(),'nightwolf-gate-fixture-'));
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const mirror=join(dir,'mirror'), witness=join(dir,'witness');
  mkdirSync(mirror);mkdirSync(witness);
  return {dir,db:join(mirror,'db.sqlite'),tip:join(mirror,'tip.json'),
    witness:join(witness,'witness.sqlite')};
}
function call(path,verb,payload) {
  const r=spawnSync(process.execPath,[CLI,path,verb],
    {input:JSON.stringify({mirrorId:id,...payload}),encoding:'utf8',timeout:15000});
  assert.ifError(r.error);assert.equal(r.status,0,r.stderr);
  return JSON.parse(r.stdout).result;
}
function seed(p) {
  const m=new NightwolfMirrorWithTip(p.db,p.tip);
  const first=m.receive(sealMirror(core('private')));m.close();
  call(p.witness,'enroll',{summary:first});
  return first;
}

test('ordinary witnessed reads consult the separate process and append generation 2',t=>{
  const p=paths(t),first=seed(p);
  let m=new NightwolfWitnessedMirror(p.db,p.tip,p.witness,id);
  assert.deepEqual(m.readForClaimedActor('codex'),[]);
  assert.deepEqual(m.readForClaimedActor('ten').map(x=>x.body),['private']);
  const second=m.receive(sealMirror(core('private','shared')));
  assert.equal(second.generation,2);
  assert.notEqual(second.digest,first.digest);
  assert.deepEqual(m.readForClaimedActor('codex').map(x=>x.body),['shared']);
  m.close();
  m=new NightwolfWitnessedMirror(p.db,p.tip,p.witness,id);
  try {assert.equal(m.summary().generation,2);} finally {m.close();}
  assert.equal(call(p.witness,'latest',{}).generation,2);
});

test('witnessed read refuses when both local mirror files were rolled back',t=>{
  const p=paths(t);seed(p);
  const oldDb=join(p.dir,'old-db'),oldTip=join(p.dir,'old-tip');
  copyFileSync(p.db,oldDb);copyFileSync(p.tip,oldTip);
  let m=new NightwolfWitnessedMirror(p.db,p.tip,p.witness,id);
  m.receive(sealMirror(core('private','shared')));m.close();
  copyFileSync(oldDb,p.db);copyFileSync(oldTip,p.tip);
  m=new NightwolfWitnessedMirror(p.db,p.tip,p.witness,id);
  try {
    assert.throws(()=>m.summary(),/Independent witness refused/);
    assert.throws(()=>m.readForClaimedActor('ten'),/Independent witness refused/);
    assert.throws(()=>m.receive(sealMirror(core('private','other'))),/Independent witness refused/);
  } finally {m.close();}
});

test('witness loss prevents reads and writes without automatically reseeding',t=>{
  const p=paths(t);seed(p);
  unlinkSync(p.witness);
  const m=new NightwolfWitnessedMirror(p.db,p.tip,p.witness,id);
  try {
    assert.throws(()=>m.readForClaimedActor('ten'),/Witness unavailable/);
    assert.throws(()=>m.receive(sealMirror(core('private','shared'))),/Witness unavailable/);
  } finally {m.close();}
});

test('fork accepted by local mirror but refused by witness leaves guarded API fail-closed',t=>{
  const p=paths(t),first=seed(p);
  const alternate=sealMirror(core('private','other fork'));
  call(p.witness,'advance',{summary:{generation:2,digest:alternate.digest},
    previousDigest:first.digest});
  const m=new NightwolfWitnessedMirror(p.db,p.tip,p.witness,id);
  try {
    assert.throws(()=>m.readForClaimedActor('ten'),/Independent witness refused/);
    assert.throws(()=>m.receive(sealMirror(core('private','shared'))),/Independent witness refused/);
  } finally {m.close();}
});

test('witness write refusal after local commit is visible and future guarded reads fail closed',t=>{
  const p=paths(t);seed(p);
  // Read-only witness still permits the preflight check, but the subsequent
  // separate process cannot commit its new receipt. No auto-repair follows.
  chmodSync(p.witness,0o400);
  const m=new NightwolfWitnessedMirror(p.db,p.tip,p.witness,id);
  try {
    assert.equal(m.summary().generation,1);
    assert.throws(()=>m.receive(sealMirror(core('private','shared'))),
      /Mirror committed but independent witness did not accept it/);
    assert.throws(()=>m.summary(),/Independent witness refused/);
  } finally {m.close();chmodSync(p.witness,0o600);}
  assert.equal(call(p.witness,'latest',{}).generation,1);
  const raw=new NightwolfMirrorWithTip(p.db,p.tip);
  try {assert.equal(raw.summary().generation,2);} finally {raw.close();}
});

test('valid multi-event batch is refused before local commit, not after witness mismatch',t=>{
  const p=paths(t),first=seed(p);
  const m=new NightwolfWitnessedMirror(p.db,p.tip,p.witness,id);
  try {
    // The raw SQLite mirror accepts this append of two events at once.
    // The witness has only one receipt slot per generation. The guarded
    // API must refuse BEFORE its own local mirror/tip are mutated.
    assert.throws(()=>m.receive(sealMirror(core('private','shared','third'))),
      /exactly one new generation per receive; no local commit/);
    assert.deepEqual(m.summary(),first);
    assert.equal(call(p.witness,'latest',{}).generation,1);
    const next=m.receive(sealMirror(core('private','shared')));
    assert.equal(next.generation,2);
    assert.equal(m.summary().generation,2);
    assert.equal(call(p.witness,'latest',{}).generation,2);
  } finally {m.close();}
});

test('witness path must not alias mirror or tip, including same-inode links',t=>{
  const p=paths(t),initial=seed(p);
  const hardlink=join(p.dir,'same-inode-hardlink.sqlite');
  const symlink=join(p.dir,'same-inode-symlink.sqlite');
  linkSync(p.db,hardlink);
  symlinkSync(p.db,symlink);
  const aliases=[
    p.db,
    join(p.dir,'mirror','..','mirror','db.sqlite'),
    p.tip,
    hardlink,
    symlink
  ];
  for (const witnessFile of aliases)
    assert.throws(()=>new NightwolfWitnessedMirror(p.db,p.tip,witnessFile,id),
      /Independent witness requires a distinct file/);
  // No attempted enrollment or modification of the database/tip.
  const raw=new NightwolfMirrorWithTip(p.db,p.tip);
  try { assert.deepEqual(raw.summary(),initial); } finally {raw.close();}
  const guarded=new NightwolfWitnessedMirror(p.db,p.tip,p.witness,id);
  try { assert.deepEqual(guarded.summary(),initial); } finally {guarded.close();}
});
