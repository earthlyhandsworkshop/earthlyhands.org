import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { handleCaught } from './two-hand-cloudflare/caught-moments.mjs';
import worker from './two-hand-cloudflare/worker.mjs';

class Statement {
  constructor(db,sql){ this.db=db;this.sql=sql;this.values=[]; }
  bind(...values){this.values=values;return this;}
  async run(){const x=this.db.prepare(this.sql).run(...this.values);return {success:true,meta:{changes:Number(x.changes)}};}
  async first(){return this.db.prepare(this.sql).get(...this.values)??null;}
  async all(){return {results:this.db.prepare(this.sql).all(...this.values)};}
}
class D1 {
  constructor(db){this.db=db;}
  prepare(sql){return new Statement(this.db,sql);}
}
const initial=readFileSync(new URL('./two-hand-cloudflare/migrations/0001_fixture.sql',import.meta.url),'utf8');
const schema=readFileSync(new URL('./two-hand-cloudflare/migrations/0002_caught_moments.sql',import.meta.url),'utf8');
const profileSchema=readFileSync(new URL('./two-hand-cloudflare/migrations/0003_caught_identity.sql',import.meta.url),'utf8');
const adminSchema=readFileSync(new URL('./two-hand-cloudflare/migrations/0004_caught_admin_provenance.sql',import.meta.url),'utf8');
const keyA='3a20e247-cd33-4f08-8180-e6514d10e284';
const keyB='3a20e247-cd33-4f08-8180-e6514d10e285';
const example={
  request_key:keyA,
  noticed_by:'An observer',
  noticed_hand:'Another hand',
  moment:'An interesting moment.\nThe work remains with its maker.',
  source_label:'Fictional source jacket',
  source_url:'https://github.com/example/repository/blob/main/fictional-jacket.md'
};
function setup(t){
 const dir=mkdtempSync(join(tmpdir(),'caught-room-'));
 const file=join(dir,'test.sqlite');
 const db=new DatabaseSync(file);
 db.exec(initial);db.exec(schema);db.exec(profileSchema);db.exec(adminSchema);
 t.after(()=>{try{db.close();}catch{} rmSync(dir,{recursive:true,force:true});});
 return {db,file,env:{DB:new D1(db),TWO_HAND_ALLOWED_EMAILS:'alice@example.test,bob@example.test',TWO_HAND_ACTOR_SALT:'test-only-not-a-real-secret',CAUGHT_TEN_EMAIL:'alice@example.test',CAUGHT_SHARED_EMAIL:'bob@example.test'}};
}
function request(path,method='GET',data,headers={}){
 return new Request('https://staging.example.test'+path,{method,
 headers:method==='POST'?{'content-type':'application/json',origin:'https://staging.example.test',...headers}:headers,
 body:method==='POST'?JSON.stringify(data):undefined});
}
async function direct(env,actor,path,method='GET',data,headers={}){
 const req=request(path,method,data,headers);
 const r=await handleCaught(req,env,new URL(req.url),{actor,email:'bob@example.test'});
 return {status:r.status,body:r.headers.get('content-type')?.includes('application/json')?await r.json():await r.text()};
}
const ctx=(email)=>({access:{async getIdentity(){return {email};}}});
async function throughWorker(env,email,path,method='GET',data){
 const req=request(path,method,data);
 const r=await worker.fetch(req,env,email?ctx(email):{});
 return {status:r.status,body:r.headers.get('content-type')?.includes('application/json')?await r.json():await r.text()};
}
test('private web door exists and empty collection is visible to authorized hands only',async t=>{
 const {env}=setup(t);
 const page=await throughWorker(env,'alice@example.test','/caught');
 assert.equal(page.status,200);
 assert.match(page.body,/Caught here/);
 assert.match(page.body,/Who holds the camera/);
 assert.equal((await throughWorker(env,null,'/api/caught')).status,403);
 assert.equal((await throughWorker(env,'mallory@example.test','/api/caught')).status,403);
 const contents=await throughWorker(env,'bob@example.test','/api/caught');
 assert.equal(contents.status,200);
 assert.deepEqual(contents.body.items,[]);
 assert.equal(contents.body.scope,'private-staging');
});
test('another hand can keep a multiline observation and a pointer; both readers see it',async t=>{
 const {db,env}=setup(t);
 const first=await throughWorker(env,'bob@example.test','/api/caught','POST',example);
 assert.equal(first.status,201);
 assert.equal(first.body.ok,true);
 assert.equal(first.body.receipt.moment,example.moment);
 assert.equal(first.body.receipt.source_url,example.source_url);
 const other=await throughWorker(env,'bob@example.test','/api/caught');
 assert.equal(other.status,200);
 assert.equal(other.body.items.length,1);
 assert.equal(other.body.items[0].noticed_by,'An observer');
 assert.equal(other.body.items[0].noticed_hand,'Another hand');
 assert.equal(other.body.items[0].source_url,example.source_url);
 assert.equal(other.body.items[0].identity_kind,'shared-account-assertion');
 assert.equal(JSON.stringify(other.body).includes('actor_hash'),false);
 assert.equal(JSON.stringify(other.body).includes(keyA),false);
 const stored=db.prepare('SELECT actor_hash,request_key,scope,status FROM caught_moments_v1').get();
 assert.match(stored.actor_hash,/^[a-f0-9]{64}$/);
 assert.equal(stored.request_key,keyA);
 assert.equal(stored.scope,'private-staging');
 assert.equal(stored.status,'observer-assertion');
});
test('uncertain network retry with same request is idempotent and cannot be hijacked',async t=>{
 const {db,env}=setup(t);
 const bob=await throughWorker(env,'bob@example.test','/api/caught','POST',example);
 assert.equal(bob.status,201);
 const replay=await throughWorker(env,'bob@example.test','/api/caught','POST',example);
 assert.equal(replay.status,201);
 assert.equal(replay.body.receipt.id,bob.body.receipt.id);
 const ten=await throughWorker(env,'alice@example.test','/api/caught/identity','POST',{workshop_name:'Ten'});
 assert.equal(ten.status,200);
 const wrongAccount=await throughWorker(env,'alice@example.test','/api/caught','POST',{...example,noticed_by:'Ten'});
 assert.equal(wrongAccount.status,409);
 const different=await throughWorker(env,'bob@example.test','/api/caught','POST',{...example,moment:'different words'});
 assert.equal(different.status,409);
 assert.equal(db.prepare('SELECT COUNT(*) as n FROM caught_moments_v1').get().n,1);
});
test('a self-reported self portrait, broken source roads and foreign origin are refused',async t=>{
 const {db,env}=setup(t);
 for(const changed of [
  {...example,noticed_hand:'An observer'},
  {...example,noticed_hand:'AN OBSERVER'},
  {...example,source_url:'http://github.com/example/file'},
  {...example,source_url:'https://drive.google.com.evil.invalid/file/x'},
  {...example,source_url:'https://example.com/secret'},
  {...example,source_url:'javascript:alert(1)'},
  {...example,source_label:''},
  {...example,moment:''}
 ]){
  assert.equal((await direct(env,'a','/api/caught','POST',changed)).status,400);
 }
 const invalidOrigin=await direct(env,'a','/api/caught','POST',example,{origin:'https://another.example'});
 assert.equal(invalidOrigin.status,403);
 assert.equal(db.prepare('SELECT COUNT(*) as n FROM caught_moments_v1').get().n,0);
});
test('no editor, deletion, source copying or publication route is created',async t=>{
 const {env}=setup(t);
 assert.equal((await direct(env,'a','/api/caught','PUT',example)).status,404);
 assert.equal((await direct(env,'a','/api/caught','DELETE')).status,404);
 const normal=await throughWorker(env,'alice@example.test','/api/state');
 assert.equal(normal.status,200);
 assert.equal(normal.body.version,0);
 assert.equal((await throughWorker(env,'alice@example.test','/')).status,200);
});


test('older observations remain reachable after forty, including shared-millisecond ties and concurrent new arrivals',async t=>{
 const {db,env}=setup(t);
 const timestamp='2026-10-30T02:34:34.786Z';
 const id=n=>'10000000-0000-4000-8000-'+String(n).padStart(12,'0');
 const key=n=>'20000000-0000-4000-8000-'+String(n).padStart(12,'0');
 function put(n,when){
  db.prepare('INSERT INTO caught_moments_v1 (id,request_key,noticed_by,noticed_hand,moment,source_label,source_url,actor_hash,created_at) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(id(n),key(n),'An observer','Another hand','Fictional observation '+n,'Test jacket','https://github.com/example/repository/blob/main/test.md','fictional-actor',when);
 }
 for(let n=0;n<93;n++)put(n,timestamp);
 const first=await throughWorker(env,'alice@example.test','/api/caught');
 assert.equal(first.status,200);
 assert.equal(first.body.items.length,40);
 assert.equal(first.body.items[0].id,id(92));
 assert.ok(first.body.nextBefore);
 put(93,'2026-10-30T02:34:34.787Z'); // A new moment must not disrupt a walk into older history.
 const seen=[...first.body.items.map(x=>x.id)];
 let cursor=first.body.nextBefore;
 const sizes=[40];
 while(cursor){
  const response=await throughWorker(env,'bob@example.test','/api/caught?before='+encodeURIComponent(cursor));
  assert.equal(response.status,200);
  const body=response.body;
  sizes.push(body.items.length);
  seen.push(...body.items.map(x=>x.id));
  cursor=body.nextBefore;
  assert.ok(sizes.length<=4,'pagination must terminate');
 }
 assert.deepEqual(sizes,[40,40,13]);
 assert.equal(new Set(seen).size,93);
 assert.deepEqual(seen,Array.from({length:93},(_,n)=>id(92-n)));
 const fresh=await throughWorker(env,'alice@example.test','/api/caught');
 assert.equal(fresh.status,200);
 assert.equal(fresh.body.items[0].id,id(93));
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM caught_moments_v1').get().n,94);
});

test('bad, duplicate or malformed cursors fail closed without changing observation records',async t=>{
 const {db,env}=setup(t);
 for(const suffix of [
  '?before=', '?before=not-a-cursor',
  '?before=2026-10-30T02:34:34.786Z~not-a-uuid',
  '?before=2026-10-30T02:34:34.786Z~10000000-0000-4000-8000-000000000001&before=2026-10-30T02:34:34.786Z~10000000-0000-4000-8000-000000000001',
  '?before='+encodeURIComponent('2026-10-30T02:34:34.786Z~10000000-0000-4000-8000-000000000001 extra')
 ]){
  const response=await throughWorker(env,'alice@example.test','/api/caught'+suffix);
  assert.equal(response.status,400);
  assert.equal(response.body.error,'invalid_cursor');
 }
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM caught_moments_v1').get().n,0);
});


test('identity check shows which email Cloudflare Access authenticated, never guesses from a shared account',async t=>{
 const {db,env}=setup(t);
 const personal=await throughWorker(env,'alice@example.test','/api/caught/identity');
 assert.equal(personal.status,200);
 assert.deepEqual(personal.body.account,{email:'alice@example.test',kind:'individual'});
 assert.equal(personal.body.profile,null);
 assert.equal(personal.body.enrollment_available,true);
 assert.equal(personal.body.contribution_mode,'registration-required');
 const shared=await throughWorker(env,'bob@example.test','/api/caught/identity');
 assert.equal(shared.status,200);
 assert.deepEqual(shared.body.account,{email:'bob@example.test',kind:'shared'});
 assert.equal(shared.body.profile,null);
 assert.equal(shared.body.enrollment_available,false);
 assert.equal(shared.body.contribution_mode,'shared-account-assertion');
 assert.equal(db.prepare('SELECT COUNT(*) n FROM caught_profiles_v1').get().n,0);
});

test('an individual must choose the Ten profile; the shared account cannot register it',async t=>{
 const {db,env}=setup(t);
 const named={...example,noticed_by:'Ten',noticed_hand:'Another hand'};
 const missing=await throughWorker(env,'alice@example.test','/api/caught','POST',named);
 assert.equal(missing.status,403);
 assert.equal(missing.body.error,'profile_registration_required');
 const sharedClaim=await throughWorker(env,'bob@example.test','/api/caught/identity','POST',{workshop_name:'Ten'});
 assert.equal(sharedClaim.status,403);
 assert.equal(sharedClaim.body.error,'personal_account_required');
 const wrongName=await throughWorker(env,'alice@example.test','/api/caught/identity','POST',{workshop_name:'Register'});
 assert.equal(wrongName.status,400);
 const wrongAliases=['X','10','ten','Small Door'];
 for(const workshop_name of wrongAliases){
  assert.equal((await throughWorker(env,'alice@example.test','/api/caught/identity','POST',{workshop_name})).status,400);
 }
 assert.equal(db.prepare('SELECT COUNT(*) n FROM caught_profiles_v1').get().n,0);
 assert.equal(db.prepare('SELECT COUNT(*) n FROM caught_moments_v1').get().n,0);
});

test('one personal sign-in can enroll as Ten and contributes account-linked receipts without client impersonation',async t=>{
 const {db,env}=setup(t);
 const register=await throughWorker(env,'alice@example.test','/api/caught/identity','POST',{workshop_name:'Ten'});
 assert.equal(register.status,200);
 assert.equal(register.body.profile.name,'Ten');
 assert.equal(register.body.profile.id,'human-ten-v1');
 assert.equal(register.body.profile.link,'account-backed');
 const again=await throughWorker(env,'alice@example.test','/api/caught/identity','POST',{workshop_name:'Ten'});
 assert.equal(again.status,200);
 assert.equal(again.body.profile.id,register.body.profile.id);
 const raw=db.prepare('SELECT * FROM caught_profiles_v1').get();
 assert.equal(raw.display_name,'Ten');
 assert.equal(raw.profile_id,'human-ten-v1');
 assert.match(raw.actor_hash,/^[a-f0-9]{64}$/);
 assert.notEqual(raw.actor_hash,'alice@example.test');
 assert.equal(JSON.stringify(raw).includes('alice@example.test'),false);
 const identity=await throughWorker(env,'alice@example.test','/api/caught/identity');
 assert.equal(identity.body.contribution_mode,'account-linked');
 assert.equal(identity.body.enrollment_available,false);
 assert.equal(identity.body.profile.name,'Ten');
 const forged=await throughWorker(env,'alice@example.test','/api/caught','POST',{...example,noticed_by:'Register'});
 assert.equal(forged.status,400);
 const self=await throughWorker(env,'alice@example.test','/api/caught','POST',{...example,noticed_by:'Ten',noticed_hand:'Ten'});
 assert.equal(self.status,400);
 const submitted=await throughWorker(env,'alice@example.test','/api/caught','POST',{...example,noticed_by:'Ten',noticed_hand:'Another hand'});
 assert.equal(submitted.status,201);
 assert.equal(submitted.body.receipt.noticed_by,'Ten');
 assert.equal(submitted.body.receipt.observer_profile_id,'human-ten-v1');
 assert.equal(submitted.body.receipt.identity_kind,'account-linked');
 assert.equal(JSON.stringify(submitted.body).includes('actor_hash'),false);
 const other=await throughWorker(env,'bob@example.test','/api/caught');
 assert.equal(other.status,200);
 assert.equal(other.body.items[0].identity_kind,'account-linked');
 assert.equal(other.body.items[0].noticed_by,'Ten');
 const sharedImpersonation=await throughWorker(env,'bob@example.test','/api/caught','POST',{...example,request_key:keyB,noticed_by:'Ten'});
 assert.equal(sharedImpersonation.status,409);
 assert.equal(sharedImpersonation.body.error,'registered_name_requires_personal_sign_in');
 assert.equal(db.prepare('SELECT COUNT(*) n FROM caught_moments_v1').get().n,1);
});

test('the identity route refuses forged email fields, wrong browser origin and unsaved configuration',async t=>{
 const {env}=setup(t);
 const bogus=await throughWorker(env,'alice@example.test','/api/caught/identity','POST',{workshop_name:'Ten',email:'bob@example.test'});
 assert.equal(bogus.status,400);
 const req=request('/api/caught/identity','POST',{workshop_name:'Ten'},{origin:'https://evil.example'});
 const rejected=await worker.fetch(req,env,ctx('alice@example.test'));
 assert.equal(rejected.status,403);
 const missing=await throughWorker({...env,CAUGHT_TEN_EMAIL:''},'alice@example.test','/api/caught/identity');
 assert.equal(missing.status,503);
 const unknown=await throughWorker({...env,TWO_HAND_ALLOWED_EMAILS:'alice@example.test,bob@example.test,mallory@example.test'},'mallory@example.test','/api/caught/identity');
 assert.equal(unknown.status,403);
});

test('the profile and its account link survive a cold SQLite reopen without changing the earlier caught entry',async t=>{
 const {db,env,file}=setup(t);
 // Existing shared-authored entry remains unlinked forever.
 const old=await throughWorker(env,'bob@example.test','/api/caught','POST',example);
 assert.equal(old.status,201);
 const reg=await throughWorker(env,'alice@example.test','/api/caught/identity','POST',{workshop_name:'Ten'});
 assert.equal(reg.status,200);
 const existing=db.prepare('SELECT observer_profile_id FROM caught_moments_v1 WHERE request_key=?').get(keyA);
 assert.equal(existing.observer_profile_id,null);
 const recoveredProfile=db.prepare('SELECT actor_hash,profile_id FROM caught_profiles_v1').get();
 assert.equal(recoveredProfile.profile_id,'human-ten-v1');
 const newEntry=await throughWorker(env,'alice@example.test','/api/caught','POST',{...example,request_key:keyB,noticed_by:'Ten'});
 assert.equal(newEntry.status,201);
 assert.equal(db.prepare('SELECT count(*) n FROM caught_moments_v1 WHERE observer_profile_id IS NOT NULL').get().n,1);
 assert.equal(db.prepare('SELECT count(*) n FROM caught_moments_v1 WHERE observer_profile_id IS NULL').get().n,1);
 db.close();
 const reopened=new DatabaseSync(file);
 try{
   const recoveredEnv={...env,DB:new D1(reopened)};
   const profile=await throughWorker(recoveredEnv,'alice@example.test','/api/caught/identity');
   assert.equal(profile.status,200);
   assert.equal(profile.body.profile.name,'Ten');
   const shelf=await throughWorker(recoveredEnv,'bob@example.test','/api/caught');
   assert.equal(shelf.status,200);
   assert.equal(shelf.body.items.length,2);
   assert.deepEqual(new Set(shelf.body.items.map(x=>x.identity_kind)),new Set(['account-linked','shared-account-assertion']));
 }finally{reopened.close();}
});

test('the shelf distinguishes an account-admin-mediated name claim from both shared sign-in labels and linked human identity',async t=>{
 const {db,env}=setup(t);
 const plain=await throughWorker(env,'bob@example.test','/api/caught','POST',example);
 const later=await throughWorker(env,'bob@example.test','/api/caught','POST',{
  ...example,request_key:keyB,noticed_by:'Register',noticed_hand:'Small Door'
 });
 assert.equal(plain.status,201);
 assert.equal(later.status,201);
 assert.equal(later.body.receipt.identity_kind,'shared-account-assertion',
  'typing Register in the shared form must not mint an admin or companion receipt');
 const handId='companion-register-v1';
 db.prepare(`INSERT INTO workshop_hand_claims_v0
  (hand_id,display_name,kind,claim_state,credential_state,app_permission,created_via,source_road,purpose)
  VALUES (?,?,?,?,?,?,?,?,?)`).run(
  handId,'Register','companion','named-unverified','not-issued','none',
  'fictional-test-admin-connector','https://github.com/example/return','provenance test only'
 );
 db.prepare(`INSERT INTO camera_admin_mediated_receipts_v0
  (moment_id,claimed_hand_id,submitted_via,authentication_state,display_state,permission_state,provenance_note)
  VALUES (?,?,?,?,?,?,?)`).run(
  later.body.receipt.id,handId,'connected-cloudflare-account-admin-tool','named-unverified',
  'unverified-name-with-caption','private-staging-no-new-grants','Test-only administrative provenance'
 );
 const shelf=await throughWorker(env,'alice@example.test','/api/caught');
 assert.equal(shelf.status,200);
 assert.equal(shelf.body.items.length,2);
 assert.equal(shelf.body.items.find(x=>x.id===later.body.receipt.id).identity_kind,'admin-mediated-unverified');
 assert.equal(shelf.body.items.find(x=>x.id===plain.body.receipt.id).identity_kind,'shared-account-assertion');
 assert.equal(JSON.stringify(shelf.body).includes('fictional-test-admin-connector'),false);
 assert.equal(JSON.stringify(shelf.body).includes('provenance test only'),false);
 assert.equal(JSON.stringify(shelf.body).includes('actor_hash'),false);
 assert.equal(JSON.stringify(shelf.body).includes('request_key'),false);
 // A receipt names a submission channel but does not change the underlying
 // person-profile field, grant a new permission, or issue any credential.
 assert.equal(db.prepare('SELECT observer_profile_id FROM caught_moments_v1 WHERE id=?').get(later.body.receipt.id).observer_profile_id,null);
 assert.equal(db.prepare('SELECT credential_state,app_permission FROM workshop_hand_claims_v0 WHERE hand_id=?').get(handId).credential_state,'not-issued');
 assert.equal(db.prepare('SELECT credential_state,app_permission FROM workshop_hand_claims_v0 WHERE hand_id=?').get(handId).app_permission,'none');
});
