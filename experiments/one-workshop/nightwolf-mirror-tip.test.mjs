// Fictional rollback witness on one local machine. Not a real trust service.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, copyFileSync, unlinkSync, readFileSync,
  writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { TIP_SCHEMA, NightwolfMirrorWithTip } from './nightwolf-mirror-tip.mjs';
import { MIRROR_SCHEMA, sealMirror } from './nightwolf-mirror.mjs';
import { NightwolfMirrorDisk } from './nightwolf-mirror-disk.mjs';

const bytes=Buffer.from('fictional leaf').toString('base64');
const sha256=createHash('sha256').update('fictional leaf').digest('hex');
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
  const dir=mkdtempSync(join(tmpdir(),'nightwolf-tip-fixture-'));
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const db=join(dir,'mirror.sqlite');
  const tipDir=join(dir,'witness');mkdirSync(tipDir);
  return {dir,db,tip:join(tipDir,'tip.json')};
}

test('a separate local tip survives close/reopen and preserves claimed-actor projection',t=>{
  const p=paths(t);
  let m=new NightwolfMirrorWithTip(p.db,p.tip);
  const first=m.receive(sealMirror(core('private')));
  assert.equal(first.generation,1);
  assert.equal(JSON.parse(readFileSync(p.tip,'utf8')).schema,TIP_SCHEMA);
  m.close();m=new NightwolfMirrorWithTip(p.db,p.tip);
  try {
    assert.deepEqual(m.summary(),first);
    assert.deepEqual(m.readForClaimedActor('codex'),[]);
    assert.deepEqual(m.readForClaimedActor('ten').map(x=>x.body),['private']);
    const next=m.receive(sealMirror(core('private','shared')));
    assert.equal(next.generation,2);
    assert.deepEqual(m.readForClaimedActor('codex').map(x=>x.body),['shared']);
  } finally {m.close();}
});

test('replacing the closed database with an older valid copy is refused',t=>{
  const p=paths(t), old=join(p.dir,'valid-old.sqlite');
  let m=new NightwolfMirrorWithTip(p.db,p.tip);
  m.receive(sealMirror(core('private')));m.close();
  copyFileSync(p.db,old);
  m=new NightwolfMirrorWithTip(p.db,p.tip);
  m.receive(sealMirror(core('private','shared')));m.close();
  copyFileSync(old,p.db);
  m=new NightwolfMirrorWithTip(p.db,p.tip);
  try {
    assert.throws(()=>m.summary(),/Local tip mismatch/);
    assert.throws(()=>m.readForClaimedActor('ten'),/Local tip mismatch/);
    assert.throws(()=>m.receive(sealMirror(core('private','shared'))),/Local tip mismatch/);
  } finally {m.close();}
  assert.equal(JSON.parse(readFileSync(p.tip,'utf8')).generation,2);
});

test('a valid alternative same-generation fork is refused by the retained tip',t=>{
  const p=paths(t), fork=join(p.dir,'fork.sqlite');
  const m=new NightwolfMirrorWithTip(p.db,p.tip);
  m.receive(sealMirror(core('private')));m.close();
  copyFileSync(p.db,fork);
  const a=new NightwolfMirrorWithTip(p.db,p.tip);
  a.receive(sealMirror(core('private','branch A')));a.close();
  const alternate=new NightwolfMirrorDisk(fork);
  alternate.receive(sealMirror(core('private','branch B')));alternate.close();
  copyFileSync(fork,p.db);
  const check=new NightwolfMirrorWithTip(p.db,p.tip);
  try { assert.throws(()=>check.summary(),/Local tip mismatch/); }
  finally {check.close();}
});

test('missing or malformed tip is never silently re-created for an existing database',t=>{
  const p=paths(t);
  let m=new NightwolfMirrorWithTip(p.db,p.tip);
  m.receive(sealMirror(core('private')));m.close();
  unlinkSync(p.tip);
  m=new NightwolfMirrorWithTip(p.db,p.tip);
  try {assert.throws(()=>m.summary(),/Local tip mismatch/);}
  finally {m.close();}
  writeFileSync(p.tip,JSON.stringify({schema:TIP_SCHEMA,generation:1,
    digest:'0'.repeat(64),unreviewedPermission:true}));
  m=new NightwolfMirrorWithTip(p.db,p.tip);
  try {assert.throws(()=>m.summary(),/Invalid local tip/);}
  finally {m.close();}
});

test('tip-write failure after a committed SQLite write fails closed, not falsely successful',t=>{
  const p=paths(t);
  const absent=join(p.dir,'no-such-directory','tip.json');
  let m=new NightwolfMirrorWithTip(p.db,absent);
  assert.throws(()=>m.receive(sealMirror(core('private'))),
    /SQLite committed but local tip did not advance/);
  m.close();
  assert.equal(existsSync(absent),false);
  const raw=new NightwolfMirrorDisk(p.db);
  try {assert.equal(raw.summary().generation,1);}
  finally {raw.close();}
  m=new NightwolfMirrorWithTip(p.db,absent);
  try {assert.throws(()=>m.summary(),/Local tip mismatch/);}
  finally {m.close();}
});

test('replacing both local files together remains an accepted rollback: not an independent trust anchor',t=>{
  const p=paths(t),oldDb=join(p.dir,'old.sqlite'),oldTip=join(p.dir,'old-tip.json');
  let m=new NightwolfMirrorWithTip(p.db,p.tip);
  m.receive(sealMirror(core('private')));m.close();
  copyFileSync(p.db,oldDb);copyFileSync(p.tip,oldTip);
  m=new NightwolfMirrorWithTip(p.db,p.tip);
  m.receive(sealMirror(core('private','shared')));m.close();
  copyFileSync(oldDb,p.db);copyFileSync(oldTip,p.tip);
  m=new NightwolfMirrorWithTip(p.db,p.tip);
  try {assert.equal(m.summary().generation,1);}
  finally {m.close();}
});
