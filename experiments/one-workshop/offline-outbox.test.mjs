// All objects, actors, and notes are invented. This is a pure-contract test,
// not a deployed sync bridge or an actual authenticated two-machine crossing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {newOutboxState, receiveOutbox, readOutboxForActor} from './offline-outbox.mjs';
import {MIRROR_SCHEMA, sealMirror, receiveMirror, visibleEvents} from './nightwolf-mirror.mjs';

const actors = {
  fieldglass: {id:'fieldglass',kind:'companion',status:'active',verbs:['read','contribute']},
  register: {id:'register',kind:'companion',status:'active',verbs:['read','contribute']},
};
const objects = {
  jacket: {id:'jacket',headRevisionId:'r:seed',rightsState:'affirmed',
    exposure:'workshop',verbs:['read','contribute']},
  privatefolio: {id:'privatefolio',headRevisionId:'r:private',
    ownerActorId:'fieldglass',rightsState:'affirmed',exposure:'private',
    sharedWith:[],verbs:['read','contribute']},
  unknown: {id:'unknown',headRevisionId:'r:unknown',
    rightsState:'unknown',exposure:'workshop',verbs:['read','contribute']},
  publicleaf: {id:'publicleaf',headRevisionId:'r:public',
    rightsState:'affirmed',exposure:'public',verbs:['read','contribute']}
};
const start=()=>newOutboxState(actors, objects);
const context=actorId=>({principalId:'trusted-fixture-bridge',actorId,attribution:'service-declared'});
const note=(eventId,actorId,objectId='jacket',body=eventId,scope='workshop')=>({
  eventId,actorId,objectId,kind:'note',parentRevisionId:null,scope,body});
const revision=(eventId,actorId,body, parentRevisionId='r:seed')=>({
  eventId,actorId,objectId:'jacket',kind:'revision',parentRevisionId,
  scope:'workshop',body});

test('Cloudflare-side note and Nightwolf offline note both survive, then mirror advances',()=>{
  let server=start();
  server=receiveOutbox(server,[note('e:cloud','fieldglass')],context('fieldglass')).state;
  const bytes=Buffer.from('fictional jacket');
  const common={schema:MIRROR_SCHEMA,actors:[{id:'fieldglass',kind:'companion',name:'Fieldglass'},
    {id:'register',kind:'companion',name:'Register'}],
    objects:[{id:'jacket',bytes:bytes.toString('base64'),
      sha256:createHash('sha256').update(bytes).digest('hex')}]};
  const envelope=state=>sealMirror({...structuredClone(common),
    generation:state.accepted.length,
    events:state.accepted.map((e,i)=>({seq:i+1,eventId:e.eventId,
      actorId:e.actorId,objectId:e.objectId,scope:e.scope,body:e.body}))});
  const nightwolf=receiveMirror(null,envelope(server));
  assert.deepEqual(visibleEvents(nightwolf,'register').map(e=>e.eventId),['e:cloud']);
  const incoming=note('e:nightwolf','register');
  const joined=receiveOutbox(server,[incoming],context('register'));
  assert.deepEqual(joined.receipts,[{eventId:'e:nightwolf',status:'accepted'}]);
  const refreshed=receiveMirror(nightwolf,envelope(joined.state));
  assert.deepEqual(visibleEvents(refreshed,'fieldglass').map(e=>e.eventId),
    ['e:cloud','e:nightwolf']);
  const replay=receiveOutbox(joined.state,[incoming],context('register'));
  assert.deepEqual(replay.receipts,[{eventId:'e:nightwolf',status:'duplicate'}]);
  assert.deepEqual(replay.state,joined.state);
});

test('two edits from the same parent preserve the losing proposal without rewriting head',()=>{
  const a=receiveOutbox(start(),[revision('e:cloud-edit','fieldglass','Cloud text')],context('fieldglass'));
  const b=receiveOutbox(a.state,[revision('e:offline-edit','register','Offline text')],context('register'));
  assert.deepEqual(b.receipts,[{eventId:'e:offline-edit',status:'held',blockedBy:'e:cloud-edit'}]);
  assert.equal(b.state.objects.jacket.headRevisionId,'e:cloud-edit');
  assert.deepEqual(b.state.accepted.map(x=>x.body),['Cloud text']);
  assert.equal(b.state.held[0].event.body,'Offline text');
  assert.deepEqual(readOutboxForActor(b.state,context('register'))[0].heldMine.map(x=>x.event.eventId),
    ['e:offline-edit']);
  assert.deepEqual(readOutboxForActor(b.state,context('fieldglass'))[0].heldMine,[]);
  const again=receiveOutbox(b.state,[revision('e:offline-edit','register','Offline text')],context('register'));
  assert.deepEqual(again.receipts,[{eventId:'e:offline-edit',status:'already-held'}]);
  assert.deepEqual(again.state,b.state);
});

test('an updated event ID is rejected rather than silently replacing accepted or held bytes',()=>{
  let s=receiveOutbox(start(),[note('e:one','fieldglass','jacket','First')],context('fieldglass')).state;
  assert.throws(()=>receiveOutbox(s,[note('e:one','fieldglass','jacket','Altered')],context('fieldglass')),
    /event ID reused/);
  s=receiveOutbox(s,[revision('e:revision','register','Received')],context('register')).state;
  s=receiveOutbox(s,[revision('e:held','fieldglass','Held')],context('fieldglass')).state;
  assert.throws(()=>receiveOutbox(s,[revision('e:held','fieldglass','Changed')],context('fieldglass')),
    /event ID reused/);
});

test('a later authorized revision follows the new head but does not erase a held proposal',()=>{
  let s=receiveOutbox(start(),[revision('e:first','fieldglass','First')],context('fieldglass')).state;
  s=receiveOutbox(s,[revision('e:stale','register','Stale')],context('register')).state;
  const r=receiveOutbox(s,[revision('e:second','register','New proposal','e:first')],context('register'));
  assert.equal(r.state.objects.jacket.headRevisionId,'e:second');
  assert.deepEqual(r.state.held.map(x=>x.event.eventId),['e:stale']);
  assert.deepEqual(r.state.accepted.map(x=>x.eventId),['e:first','e:second']);
});

test('private folio contribution is inaccessible to another claimed actor',()=>{
  const privateNote=note('e:folio','fieldglass','privatefolio','Private words','private');
  const s=receiveOutbox(start(),[privateNote],context('fieldglass')).state;
  assert.ok(readOutboxForActor(s,context('fieldglass')).some(o=>o.objectId==='privatefolio'));
  assert.ok(!readOutboxForActor(s,context('register')).some(o=>o.objectId==='privatefolio'));
  assert.throws(()=>receiveOutbox(s,[note('e:theft','register','privatefolio','Intrusion','private')],context('register')),
    /PRIVATE_OBJECT/);
});

test('claimed identity, unknown rights, public release, and scope mismatches refuse',()=>{
  const s=start();
  assert.throws(()=>receiveOutbox(s,[note('e:forged','fieldglass')],context('register')),
    /ACTOR_MISMATCH/);
  assert.throws(()=>receiveOutbox(s,[note('e:unknown','fieldglass','unknown')],context('fieldglass')),
    /RIGHTS_UNRESOLVED/);
  assert.throws(()=>receiveOutbox(s,[note('e:public','fieldglass','publicleaf')],context('fieldglass')),
    /PUBLIC_RELEASE_READ_ONLY/);
  assert.throws(()=>receiveOutbox(s,[note('e:scope','fieldglass','jacket','mismatch','private')],context('fieldglass')),
    /scope mismatch/);
  const malformed={...note('e:extra','fieldglass'),unrecognizedFutureRights:'public'};
  assert.throws(()=>receiveOutbox(s,[malformed],context('fieldglass')),/Invalid outbox event/);
});

test('one bad packet leaves the caller state unchanged; unknown parent is not auto-merged',()=>{
  const before=start();
  const snapshot=structuredClone(before);
  assert.throws(()=>receiveOutbox(before,[note('e:good','register'),
    revision('e:bad','register','no parent','r:missing')],context('register')),
    /Unknown parent revision/);
  assert.deepEqual(before,snapshot);
  assert.throws(()=>receiveOutbox(before,[note('e:good','register'),
    note('e:good','register','jacket','changed')],context('register')),
    /event ID reused/);
  assert.deepEqual(before,snapshot);
});
