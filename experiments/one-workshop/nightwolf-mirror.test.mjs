import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {MIRROR_SCHEMA,sealMirror,receiveMirror,visibleEvents} from './nightwolf-mirror.mjs';
test('a companion can read a verified fictional mirror',()=>{
 const bytes=Buffer.from('image').toString('base64');
 const sha256=createHash('sha256').update(Buffer.from(bytes,'base64')).digest('hex');
 const core={schema:MIRROR_SCHEMA,generation:1,
  actors:[{id:'codex',kind:'companion',name:'Codex'}],
  objects:[{id:'image',bytes,sha256}],
  events:[{seq:1,eventId:'e:1',actorId:'codex',objectId:'image',scope:'workshop',body:'hello'}]};
 const saved=receiveMirror(null,sealMirror(core));
 assert.equal(visibleEvents(saved,'codex')[0].body,'hello');
});
