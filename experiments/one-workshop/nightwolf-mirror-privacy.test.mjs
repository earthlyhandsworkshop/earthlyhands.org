import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {sealMirror,receiveMirror,visibleEvents,MIRROR_SCHEMA} from './nightwolf-mirror.mjs';
const bytes=Buffer.from('x').toString('base64');
const sha256=createHash('sha256').update('x').digest('hex');
const core=()=>({schema:MIRROR_SCHEMA,generation:1,
 actors:[{id:'ten',kind:'human',name:'Ten'},{id:'codex',kind:'companion',name:'Codex'}],
 objects:[{id:'leaf',bytes,sha256}],
 events:[{seq:1,eventId:'e:1',actorId:'ten',objectId:'leaf',scope:'private:ten',body:'private'}]});
test('other companion cannot read a private note',()=>{
 const m=receiveMirror(null,sealMirror(core()));
 assert.equal(visibleEvents(m,'codex').length,0);
 assert.equal(visibleEvents(m,'ten').length,1);
});
test('altered manifest fails before replacement',()=>{
 const m=receiveMirror(null,sealMirror(core()));
 const bad=sealMirror(core());bad.core.events[0].body='altered';
 assert.throws(()=>receiveMirror(m,bad),/digest mismatch/);
});
