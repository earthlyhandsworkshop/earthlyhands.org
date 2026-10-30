import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {authenticateRegisterCamera,bindRegisterObservation,REGISTER_PRINCIPAL_ID} from './register-camera-auth-v0.mjs';

const id='test-register-credential.access';
const secret='test-only-never-use-as-a-real-credential';
const digest=s=>createHash('sha256').update(s).digest('hex');
const env={
  CAUGHT_REGISTER_CLIENT_ID:id,
  CAUGHT_REGISTER_SECRET_SHA256:digest(secret),
  TWO_HAND_ACTOR_SALT:'test-salt-not-a-live-worker-secret'
};
const access={access:{getIdentity:async()=>({email:null})}};
const request=(clientId=id,clientSecret=secret)=>new Request(
  'https://staging.example.test/api/caught/register',{
    method:'POST',
    headers:{'CF-Access-Client-Id':clientId,'CF-Access-Client-Secret':clientSecret}
  });
const attempt=(req=request(),e=env,ctx=access)=>
  authenticateRegisterCamera({request:req,env:e,ctx});

test('no Access authentication means no Register, even with correct headers',async()=>{
  const r=await attempt(request(),env,{});
  assert.deepEqual(r,{ok:false,status:403,error:'cloudflare_access_required'});
});
test('missing or wrong service credentials fail closed',async()=>{
  for(const req of [
    request('',secret),request(id,''),request('wrong.access',secret),
    request(id,'wrong-secret'),request(id,'X'.repeat(257))
  ]){
    const r=await attempt(req);
    assert.equal(r.ok,false);
    assert.equal(r.status,403);
  }
});
test('missing or malformed server configuration never admits a principal',async()=>{
  for(const modified of [
    {...env,CAUGHT_REGISTER_CLIENT_ID:''},
    {...env,CAUGHT_REGISTER_SECRET_SHA256:''},
    {...env,CAUGHT_REGISTER_SECRET_SHA256:'bad'},
    {...env,TWO_HAND_ACTOR_SALT:''}
  ]){
    const r=await attempt(request(),modified);
    assert.equal(r.ok,false);
    assert.equal(r.status,503);
  }
});
test('valid scoped machine credential yields one stable Register identity, without returning secrets',async()=>{
  const a=await attempt();
  const b=await attempt();
  assert.equal(a.ok,true);
  assert.equal(a.principal.id,REGISTER_PRINCIPAL_ID);
  assert.equal(a.principal.display_name,'Register');
  assert.equal(a.principal.identity_kind,'companion-service-token');
  assert.match(a.principal.actor_hash,/^[0-9a-f]{64}$/);
  assert.equal(a.principal.actor_hash,b.principal.actor_hash);
  assert.deepEqual(a.capabilities,['caught:create']);
  const value=JSON.stringify(a);
  assert.doesNotMatch(value,/test-only-never-use-as-a-real-credential|test-salt-not-a-live-worker-secret/);
});
test('server chooses Register; forged author and actor fields are refused',async()=>{
  const auth=await attempt();
  const sample={
    request_key:'10000000-0000-4000-8000-000000000001',
    noticed_hand:'Touchstone',moment:'The creek runs past the map.',
    source_label:'The creek runs past the map',
    source_url:'https://drive.google.com/file/d/1owAiC1ipCvUAqb27LDmKmuPly51LaGtWHSqPH_2saMA/view'
  };
  const bound=bindRegisterObservation(sample,auth);
  assert.equal(bound.noticed_by,'Register');
  assert.equal(bound.observer_service_id,REGISTER_PRINCIPAL_ID);
  assert.equal(bound.source_url,sample.source_url);
  assert.equal(sample.noticed_by,undefined,'never rewrite the caller input');
  for(const attempted of [
    {...sample,noticed_by:'Ten'}, {...sample,actor_hash:'spoof'},
    {...sample,observer_service_id:'companion-ravel-v1'},
    {...sample,observer_profile_id:'human-ten-v1'},
    {...sample,principal:'Register'}, {...sample,identity_kind:'account-linked'}
  ])assert.equal(bindRegisterObservation(attempted,auth),null);
  assert.equal(bindRegisterObservation(sample,{ok:false}),null);
});
test('rotating a secret invalidates the old credential',async()=>{
  const rotated={...env,CAUGHT_REGISTER_SECRET_SHA256:digest('new-rotated-secret')};
  assert.equal((await attempt(request(),rotated)).ok,false);
  const newSession=await attempt(request(id,'new-rotated-secret'),rotated);
  assert.equal(newSession.ok,true);
  assert.equal(newSession.principal.id,REGISTER_PRINCIPAL_ID);
});
