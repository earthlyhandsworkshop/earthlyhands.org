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
 db.exec(initial);db.exec(schema);db.exec(profileSchema);
 t.after(()=>{try{db.close();}catch{} rmSync(dir,{recursive:true,force:true});});
 return {db,env:{DB:new D1(db),TWO_HAND_ALLOWED_EMAILS:'alice@example.test,bob@example.test',TWO_HAND_ACTOR_SALT:'test-only-not-a-real-secret',CAUGHT_TEN_EMAIL:'alice@example.test',CAUGHT_SHARED_EMAIL:'bob@example.test'}};
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
