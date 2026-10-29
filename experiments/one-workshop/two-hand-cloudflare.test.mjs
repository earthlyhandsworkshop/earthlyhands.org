import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { handleTwoHand } from './two-hand-cloudflare/worker.mjs';

class Statement {
  constructor(db, sql) { this.db=db; this.sql=sql; this.args=[]; }
  bind(...args) { this.args=args; return this; }
  async run() { const r=this.db.prepare(this.sql).run(...this.args); return { success:true, meta:{ changes:Number(r.changes) } }; }
  async first() { return this.db.prepare(this.sql).get(...this.args)??null; }
  async all() { return { results:this.db.prepare(this.sql).all(...this.args) }; }
}
class D1 { constructor(db) { this.db=db; } prepare(sql){return new Statement(this.db,sql);} }
const schema=readFileSync(new URL('./two-hand-cloudflare/migrations/0001_fixture.sql',import.meta.url),'utf8');
const envFor=db=>({ DB:new D1(db),TWO_HAND_ALLOWED_EMAILS:'alice@example.test,bob@example.test',TWO_HAND_ACTOR_SALT:'fictional-secret-for-tests' });
const ctxFor=email=>({access:{async getIdentity(){return {email};}}});
const request=(path,method='GET',body)=>new Request('https://two-hand.example.test'+path,{method,headers:body?{'content-type':'application/json','origin':'https://two-hand.example.test'}:{},body:body?JSON.stringify(body):undefined});
const idA='b4df2572-299b-49ad-b100-4ac6c185a311';
const idB='b4df2572-299b-49ad-b100-4ac6c185a312';
function setup(t){const dir=mkdtempSync(join(tmpdir(),'two-hand-'));const file=join(dir,'test.sqlite');const db=new DatabaseSync(file);db.exec(schema);t.after(()=>{try{db.close();}catch{} rmSync(dir,{recursive:true,force:true});});return {db,env:envFor(db),file};}
async function call(env,ctx,path,method='GET',body){const r=await handleTwoHand(request(path,method,body),env,ctx);return {status:r.status,body:r.headers.get('content-type')?.includes('application/json')?await r.json():await r.text()};}

test('unauthenticated and third-party identities never read the shared fixture',async t=>{
 const {env}=setup(t);
 assert.equal((await call(env,{},'/api/state')).status,403);
 assert.equal((await call(env,ctxFor('mallory@example.test'),'/api/state')).status,403);
 assert.equal((await call({...env,TWO_HAND_ALLOWED_EMAILS:'alice@example.test'},ctxFor('alice@example.test'),'/api/state')).status,503);
});
test('two authenticated hands see one D1 revision; stale writer cannot overwrite it',async t=>{
 const {env}=setup(t); const alice=ctxFor('alice@example.test'),bob=ctxFor('bob@example.test');
 const before=await call(env,alice,'/api/state');assert.equal(before.body.version,0);
 const next=await call(env,alice,'/api/state','PUT',{body:'Alice writes a fictional line.',expectedVersion:0,requestId:idA});
 assert.equal(next.status,200);assert.equal(next.body.state.version,1);
 const stale=await call(env,bob,'/api/state','PUT',{body:'Bob has a stale copy.',expectedVersion:0,requestId:idB});
 assert.equal(stale.status,409);assert.equal(stale.body.currentVersion,1);
 const fresh=await call(env,bob,'/api/state');assert.equal(fresh.body.body,'Alice writes a fictional line.');
 const accepted=await call(env,bob,'/api/state','PUT',{body:'Bob adds a second line.',expectedVersion:1,requestId:idB});
 assert.equal(accepted.status,200);assert.equal(accepted.body.state.version,2);
 const history=await call(env,alice,'/api/history');assert.deepEqual(history.body.events.map(x=>x.version),[1,2]);
 const exportDoc=await call(env,alice,'/api/export');assert.deepEqual(exportDoc.body.history.map(x=>x.body),['Alice writes a fictional line.','Bob adds a second line.']);
});
test('retry is idempotent and competing writes leave no duplicate history',async t=>{
 const {env}=setup(t),alice=ctxFor('alice@example.test'),bob=ctxFor('bob@example.test');
 const payload={body:'one',expectedVersion:0,requestId:idA};
 const [one,two]=await Promise.all([call(env,alice,'/api/state','PUT',payload),call(env,bob,'/api/state','PUT',{body:'two',expectedVersion:0,requestId:idB})]);
 assert.deepEqual([one.status,two.status].sort(),[200,409]);
 const winner = one.status===200 ? {ctx:alice,payload} : {ctx:bob,payload:{body:'two',expectedVersion:0,requestId:idB}};
 const again=await call(env,winner.ctx,'/api/state','PUT',winner.payload);
 assert.equal(again.status,200);assert.equal(again.body.replay,true);
 assert.equal((await call(env,alice,'/api/history')).body.events.length,1);
 const different=await call(env,winner.ctx,'/api/state','PUT',{...winner.payload,body:'different'});assert.equal(different.status,409);
});
test('reopening the SQLite file preserves one server-owned state and exact receipts',async t=>{
 const {db,env,file}=setup(t);
 await call(env,ctxFor('alice@example.test'),'/api/state','PUT',{body:'persistent fictional text',expectedVersion:0,requestId:idA});
 db.close();const reopened=new DatabaseSync(file);
 const read=await call(envFor(reopened),ctxFor('bob@example.test'),'/api/state');
 assert.equal(read.body.version,1);assert.equal(read.body.body,'persistent fictional text');
 assert.equal((await call(envFor(reopened),ctxFor('bob@example.test'),'/api/history')).body.events.length,1);
 reopened.close();
});
test('cross-site origin and malformed input cannot mutate the record',async t=>{
 const {env}=setup(t);
 const ctx=ctxFor('alice@example.test');
 const bad=new Request('https://two-hand.example.test/api/state',{method:'PUT',headers:{origin:'https://evil.example','content-type':'application/json'},body:JSON.stringify({body:'test',expectedVersion:0,requestId:idA})});
 assert.equal((await handleTwoHand(bad,env,ctx)).status,403);
 assert.equal((await call(env,ctx,'/api/state','PUT',{body:'test',expectedVersion:0,requestId:'not-a-uuid'})).status,400);
 assert.equal((await call(env,ctx,'/api/state')).body.version,0);
});

// These are scripted-DOM checks, not actual browser, Access, or deployed D1 checks.
async function openFictionalPage(env, intercept, onInitialPending) {
 const page=await call(env,ctxFor('alice@example.test'),'/');
 assert.equal(page.status,200);
 const script=page.body.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
 assert.ok(script,'the private page must contain its browser script');
 const elements=Object.fromEntries(['rev','body','status','save','refresh','export'].map(k=>[k,{value:'',textContent:'',addEventListener(){}}]));
 const ids=[idA,idB];
 const remote=async (path,options={})=>{
  const method=options.method||'GET';
  const body=options.body?JSON.parse(options.body):undefined;
  const invoke=()=>handleTwoHand(request(path,method,body),env,ctxFor('alice@example.test'));
  return intercept?intercept({method,path,body,invoke}):invoke();
 };
 const sandbox={document:{getElementById:id=>elements[id]},crypto:{randomUUID:()=>ids.shift()||idA},fetch:remote};
 runInNewContext(script+'\n;globalThis.__ui={load,save};',sandbox);
 const initialLoad=sandbox.__ui.load();
 if(onInitialPending) await onInitialPending(elements);
 await initialLoad;
 return {elements,ui:sandbox.__ui};
}

test('browser page refuses to erase unsaved writing on refresh',async t=>{
 const {env}=setup(t);
 const {elements,ui}=await openFictionalPage(env);
 assert.match(elements.body.value,/invented page/);
 elements.body.value='Words that have not been saved yet.';
 await ui.load();
 assert.equal(elements.body.value,'Words that have not been saved yet.');
 assert.match(elements.status.textContent,/Refresh refused: unsaved writing/);
 assert.equal((await call(env,ctxFor('alice@example.test'),'/api/state')).body.version,0);
});

test('browser page preserves new typing during a pending save',async t=>{
 const {env}=setup(t);
 let unblock;
 const intercept=async ({method,invoke})=>{
  if(method==='PUT') await new Promise(resolve=>{unblock=resolve;});
  return invoke();
 };
 const {elements,ui}=await openFictionalPage(env,intercept);
 elements.body.value='The draft I intended to save.';
 const first=ui.save();
 assert.equal(typeof unblock,'function');
 elements.body.value='A newer paragraph while the save was pending.';
 unblock();
 await first;
 assert.equal(elements.body.value,'A newer paragraph while the save was pending.');
 assert.match(elements.status.textContent,/newer unsaved writing/);
 assert.equal((await call(env,ctxFor('bob@example.test'),'/api/state')).body.body,'The draft I intended to save.');
 const second=ui.save();
 assert.equal(typeof unblock,'function');
 unblock();
 await second;
 const current=(await call(env,ctxFor('bob@example.test'),'/api/state')).body;
 assert.equal(current.body,'A newer paragraph while the save was pending.');
 assert.equal(current.version,2);
 assert.deepEqual((await call(env,ctxFor('bob@example.test'),'/api/history')).body.events.map(x=>x.version),[1,2]);
});

test('in-flight refresh cannot roll back a save that finished while GET was pending',async t=>{
 const {env}=setup(t);
 let getCount=0,unblock,signaled;
 const caught=new Promise(resolve=>{signaled=resolve;});
 const intercept=async ({method,invoke})=>{
  if(method==='GET'&&++getCount===2){
   const earlierResponse=await invoke();
   await new Promise(resolve=>{unblock=resolve;signaled();});
   return earlierResponse;
  }
  return invoke();
 };
 const {elements,ui}=await openFictionalPage(env,intercept);
 const refreshing=ui.load();
 await caught;
 elements.body.value='The words I saved while an older refresh waited.';
 await ui.save();
 assert.equal(elements.rev.textContent,'Your saved revision 1');
 unblock();
 await refreshing;
 assert.equal(elements.body.value,'The words I saved while an older refresh waited.');
 assert.equal(elements.rev.textContent,'Your saved revision 1');
 assert.match(elements.status.textContent,/Not refreshed: writing or saved revision changed/);
 const actual=(await call(env,ctxFor('bob@example.test'),'/api/state')).body;
 assert.equal(actual.version,1);
 assert.equal(actual.body,elements.body.value);
});

test('initial loading does not erase words typed before the first response',async t=>{
 const {env}=setup(t);
 let release;
 const intercept=async ({method,invoke})=>{
  if(method==='GET')await new Promise(resolve=>{release=resolve;});
  return invoke();
 };
 const {elements,ui}=await openFictionalPage(env,intercept,async elements=>{
  elements.body.value='I arrived and began writing before the page loaded.';
  release();
 });
 assert.equal(elements.body.value,'I arrived and began writing before the page loaded.');
 assert.match(elements.status.textContent,/Not refreshed: writing or saved revision changed/);
 assert.equal((await call(env,ctxFor('bob@example.test'),'/api/state')).body.version,0);
});
