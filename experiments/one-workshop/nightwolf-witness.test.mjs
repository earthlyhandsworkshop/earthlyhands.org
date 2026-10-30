// A fictional Nightwolf continuity witness in a separate Node process.
// The witness receives only digest/generation claims, never private bodies.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, copyFileSync, existsSync,
  readFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { MIRROR_SCHEMA, sealMirror } from './nightwolf-mirror.mjs';
import { NightwolfMirrorWithTip } from './nightwolf-mirror-tip.mjs';
import { NightwolfWitnessStore } from './nightwolf-witness.mjs';

const CLI=fileURLToPath(new URL('./nightwolf-witness-cli.mjs',import.meta.url));
const MIRROR_ID='nightwolf-fixture';
const bytes=Buffer.from('invented paper').toString('base64');
const sha256=createHash('sha256').update('invented paper').digest('hex');
function core(...bodies) {
  return {schema:MIRROR_SCHEMA,generation:bodies.length,
    actors:[{id:'ten',kind:'human',name:'Ten'},
      {id:'codex',kind:'companion',name:'Codex'}],
    objects:[{id:'leaf',bytes,sha256}],
    events:bodies.map((body,i)=>({seq:i+1,eventId:'e:'+String(i+1),
      actorId:i===0?'ten':'codex',objectId:'leaf',
      scope:i===0?'private:ten':'workshop',body}))};
}
function setup(t) {
  const root=mkdtempSync(join(tmpdir(),'nightwolf-external-witness-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const mirrorDir=join(root,'mirror'),witnessDir=join(root,'witness');
  mkdirSync(mirrorDir);mkdirSync(witnessDir);
  return {root,db:join(mirrorDir,'mirror.sqlite'),
    tip:join(mirrorDir,'tip.json'),witness:join(witnessDir,'witness.sqlite')};
}
function call(path,verb,request) {
  // The receiving process is passed only its own database path and a
  // small digest/generation request; not the mirror database, tip, or bodies.
  const input=JSON.stringify(request);
  const result=spawnSync(process.execPath,[CLI,path,verb],
    {input,encoding:'utf8',timeout:15000,windowsHide:true});
  assert.ifError(result.error);
  return {status:result.status,stderr:result.stderr,
    output:result.status===0?JSON.parse(result.stdout):null,input};
}
function accepted(path,verb,request) {
  const r=call(path,verb,request);
  assert.equal(r.status,0,r.stderr);
  return r.output.result;
}
function refused(path,verb,request,pattern) {
  const r=call(path,verb,request);
  assert.equal(r.status,1,r.stderr);
  assert.match(r.stderr,pattern);
}
const summaryRequest=summary=>({mirrorId:MIRROR_ID,summary});

// An explicit first enrollment is required; read-only checks do not create it.
test('independent witness process enrolls only a digest and checks a cold mirror',t=>{
  const p=setup(t);
  const mirror=new NightwolfMirrorWithTip(p.db,p.tip);
  const first=mirror.receive(sealMirror(core('private fictional note')));
  mirror.close();
  assert.equal(existsSync(p.witness),false);
  refused(p.witness,'check',summaryRequest(first),/Witness unavailable/);
  assert.equal(existsSync(p.witness),false);
  const enrollment=accepted(p.witness,'enroll',summaryRequest(first));
  assert.equal(enrollment.generation,1);
  assert.equal(enrollment.digest,first.digest);
  assert.equal(accepted(p.witness,'check',summaryRequest(first)).receipt,enrollment.receipt);
  const dbBytes=readFileSync(p.witness);
  assert.equal(dbBytes.includes(Buffer.from('private fictional note')),false);
  assert.equal(dbBytes.includes(Buffer.from('invented paper')),false);
  assert.equal(dbBytes.includes(Buffer.from('ten')),false);
});

test('independent witness catches simultaneous rollback of both local mirror files',t=>{
  const p=setup(t);
  const oldDb=join(p.root,'old.sqlite'),oldTip=join(p.root,'old-tip.json');
  let mirror=new NightwolfMirrorWithTip(p.db,p.tip);
  const first=mirror.receive(sealMirror(core('private')));
  accepted(p.witness,'enroll',summaryRequest(first));
  mirror.close();
  copyFileSync(p.db,oldDb);copyFileSync(p.tip,oldTip);
  mirror=new NightwolfMirrorWithTip(p.db,p.tip);
  const second=mirror.receive(sealMirror(core('private','shared')));
  mirror.close();
  accepted(p.witness,'advance',{mirrorId:MIRROR_ID,summary:second,previousDigest:first.digest});
  assert.equal(accepted(p.witness,'check',summaryRequest(second)).generation,2);
  copyFileSync(oldDb,p.db);copyFileSync(oldTip,p.tip);
  mirror=new NightwolfMirrorWithTip(p.db,p.tip);
  try { assert.equal(mirror.summary().generation,1); } finally {mirror.close();}
  refused(p.witness,'check',summaryRequest(first),/Witness mismatch/);
  refused(p.witness,'advance',{mirrorId:MIRROR_ID,
    summary:second,previousDigest:first.digest},/rollback, fork/);
  assert.equal(accepted(p.witness,'latest',{mirrorId:MIRROR_ID}).generation,2);
});

test('same-generation alternate history is refused without overwriting the witness',t=>{
  const p=setup(t);
  const first=sealMirror(core('private'));
  const second=sealMirror(core('private','shared A'));
  const fork=sealMirror(core('private','shared B'));
  accepted(p.witness,'enroll',summaryRequest({generation:1,digest:first.digest}));
  accepted(p.witness,'advance',{mirrorId:MIRROR_ID,
    summary:{generation:2,digest:second.digest},previousDigest:first.digest});
  refused(p.witness,'check',summaryRequest({generation:2,digest:fork.digest}),/Witness mismatch/);
  refused(p.witness,'advance',{mirrorId:MIRROR_ID,
    summary:{generation:2,digest:fork.digest},previousDigest:first.digest},/rollback, fork/);
  assert.equal(accepted(p.witness,'latest',{mirrorId:MIRROR_ID}).digest,second.digest);
});

test('skipped generation, wrong predecessor, repeated enrollment and extra fields are refused',t=>{
  const p=setup(t),first=sealMirror(core('private')),
    second=sealMirror(core('private','shared')),
    third=sealMirror(core('private','shared','third'));
  const s1={generation:1,digest:first.digest};
  const s2={generation:2,digest:second.digest};
  const s3={generation:3,digest:third.digest};
  refused(p.witness,'advance',{mirrorId:MIRROR_ID,summary:s2,
    previousDigest:first.digest},/Witness unavailable/);
  accepted(p.witness,'enroll',summaryRequest(s1));
  refused(p.witness,'enroll',summaryRequest(s1),/already enrolled/);
  refused(p.witness,'advance',{mirrorId:MIRROR_ID,summary:s3,
    previousDigest:first.digest},/rollback, fork/);
  refused(p.witness,'advance',{mirrorId:MIRROR_ID,summary:s2,
    previousDigest:'f'.repeat(64)},/rollback, fork/);
  refused(p.witness,'check',{mirrorId:MIRROR_ID,summary:s1,
    hiddenPermission:true},/Unexpected witness request fields/);
  assert.equal(accepted(p.witness,'latest',{mirrorId:MIRROR_ID}).generation,1);
});

test('tampered witness chronology fails closed, even if row looks well-formed',t=>{
  const p=setup(t),first=sealMirror(core('private'));
  accepted(p.witness,'enroll',summaryRequest({generation:1,digest:first.digest}));
  const raw=new DatabaseSync(p.witness);
  raw.prepare('UPDATE witness_events SET digest=? WHERE mirror_id=? AND generation=1')
    .run('a'.repeat(64),MIRROR_ID);
  raw.close();
  refused(p.witness,'latest',{mirrorId:MIRROR_ID},/Witness chronology invalid/);
  refused(p.witness,'enroll',summaryRequest({generation:1,digest:first.digest}),
    /Witness chronology invalid/);
});

test('unwitnessed mirror advance is detected and never auto-approved',t=>{
  const p=setup(t);
  const mirror=new NightwolfMirrorWithTip(p.db,p.tip);
  const first=mirror.receive(sealMirror(core('private')));
  accepted(p.witness,'enroll',summaryRequest(first));
  const second=mirror.receive(sealMirror(core('private','shared')));
  mirror.close();
  refused(p.witness,'check',summaryRequest(second),/Witness mismatch/);
  assert.equal(accepted(p.witness,'latest',{mirrorId:MIRROR_ID}).generation,1);
  // Only an explicit reviewed advance is allowed; these test values do not
  // establish real authorization or prove that the claimed mirror is true.
  accepted(p.witness,'advance',{mirrorId:MIRROR_ID,summary:second,
    previousDigest:first.digest});
  assert.equal(accepted(p.witness,'check',summaryRequest(second)).generation,2);
});

test('two SQLite witness handles cannot both accept the same next generation',t=>{
  const p=setup(t),s1=sealMirror(core('private')),
    s2=sealMirror(core('private','shared'));
  const first=new NightwolfWitnessStore(p.witness,{create:true});
  const second=new NightwolfWitnessStore(p.witness,{writable:true});
  t.after(()=>{first.close();second.close();});
  first.enroll(MIRROR_ID,{generation:1,digest:s1.digest});
  first.advance(MIRROR_ID,{generation:2,digest:s2.digest},s1.digest);
  assert.throws(()=>second.advance(MIRROR_ID,{generation:2,digest:s2.digest},s1.digest),
    /rollback, fork/);
  assert.equal(second.latest(MIRROR_ID).generation,2);
});

test('rollback of the independent witness too is still accepted: no protected trust anchor',t=>{
  const p=setup(t),oldWitness=join(p.root,'old-witness.sqlite');
  const first=sealMirror(core('private')),
    second=sealMirror(core('private','shared'));
  accepted(p.witness,'enroll',summaryRequest({generation:1,digest:first.digest}));
  copyFileSync(p.witness,oldWitness);
  accepted(p.witness,'advance',{mirrorId:MIRROR_ID,
    summary:{generation:2,digest:second.digest},previousDigest:first.digest});
  copyFileSync(oldWitness,p.witness);
  assert.equal(accepted(p.witness,'check',summaryRequest({generation:1,digest:first.digest})).generation,1);
});
