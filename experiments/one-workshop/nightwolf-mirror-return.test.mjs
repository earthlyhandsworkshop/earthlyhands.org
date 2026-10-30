import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {sealMirror,receiveMirror,MIRROR_SCHEMA} from './nightwolf-mirror.mjs';
const bytes=Buffer.from('x').toString('base64');
const sha256=createHash('sha256').update('x').digest('hex');
const core=()=>({schema:MIRROR_SCHEMA,generation:1,
 actors:[{id:'codex',kind:'companion',name:'Codex'}],
 objects:[{id:'leaf',bytes,sha256}],
 events:[{seq:1,eventId:'e:1',actorId:'codex',objectId:'leaf',scope:'workshop',body:'first'}]});
test('new generation accepted, old generation refused',()=>{
 const old=receiveMirror(null,sealMirror(core()));
 const next=core();next.generation=2;
 next.events.push({seq:2,eventId:'e:2',actorId:'codex',objectId:'leaf',scope:'workshop',body:'second'});
 const saved=receiveMirror(old,sealMirror(next));
 assert.equal(saved.core.generation,2);
 assert.throws(()=>receiveMirror(saved,sealMirror(core())),/rollback/);
});
test('rehashed rewrite of earlier event cannot cross',()=>{
 const old=receiveMirror(null,sealMirror(core()));
 const next=core();next.events[0].body='rewritten';next.generation=2;
 next.events.push({seq:2,eventId:'e:2',actorId:'codex',objectId:'leaf',scope:'workshop',body:'second'});
 assert.throws(()=>receiveMirror(old,sealMirror(next)),/history rewrite/);
});
