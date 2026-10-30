import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { handleFinger } from './handler.mjs';

const actorA='a'.repeat(64),actorB='b'.repeat(64);
const pair='ravel-fictional-compare-01';
const original='The council declined the proposed footbridge at West Ford.';
const key='b30b9d83-5a3a-46cd-89f9-fd40b78b0525';
const url='https://staging.example';
const attempt=(extra={})=>({pair_id:pair,hand_label:'Ravel',act:'propose',replies_to:null,reading:'One refusal may have been generalized.',request_key:key,...extra});
const post=(data,origin=url)=>({method:'POST',headers:{'content-type':'application/json',origin},body:JSON.stringify(data)});

function setup(){
 const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');
 for(const name of ['schema.sql','fixture.sql','account-receipts.sql'])db.exec(readFileSync(new URL(name,import.meta.url),'utf8'));
 const env={DB:{prepare(sql){return {bind(...args){return {
   first:async()=>db.prepare(sql).get(...args)||null,
   all:async()=>({results:db.prepare(sql).all(...args)}),
   run:async()=>({success:true,meta:{changes:db.prepare(sql).run(...args).changes}}),
   _run:()=>db.prepare(sql).run(...args)
 };},first:async()=>db.prepare(sql).get()||null,all:async()=>({results:db.prepare(sql).all()})}},
 async batch(queries){db.exec('BEGIN IMMEDIATE');try{const out=queries.map(q=>({success:true,meta:{changes:q._run().changes}}));db.exec('COMMIT');return out;}catch(e){db.exec('ROLLBACK');throw e;}}
 }};
 return {db,env};
}
async function invoke(env,path,init={},actor=actorA){
 const req=new Request(url+path,init),res=await handleFinger(req,env,new URL(req.url),actor?{actor}:null);
 return {status:res.status,body:res.headers.get('content-type')?.includes('json')?await res.json():await res.text()};
}
test('same fictional source is readable by both accounts; unauthorized is refused',async()=>{
 const {env}=setup();
 assert.equal((await invoke(env,'/api/fingers/v0',{},null)).status,403);
 const a=await invoke(env,'/api/fingers/v0'),b=await invoke(env,'/api/fingers/v0',{},actorB);
 assert.equal(a.status,200);assert.deepEqual(a.body.spans,b.body.spans);
 assert.equal(a.body.spans.length,2);assert.equal(a.body.assertions.length,2);
 assert.equal(a.body.total_readings,2);assert.ok(a.body.readings.every(r=>!r.account_authenticated));
 assert.equal((await invoke(env,'/fingers')).status,200);
});
test('two accounts have equal contribution rights, with true idempotent replay',async()=>{
 const {db,env}=setup();
 const first=await invoke(env,'/api/fingers/v0/readings',post(attempt()),actorA);
 assert.equal(first.status,200,JSON.stringify(first.body));assert.equal(first.body.replay,false);
 assert.equal((await invoke(env,'/api/fingers/v0/readings',post(attempt()),actorA)).body.replay,true);
 assert.equal((await invoke(env,'/api/fingers/v0/readings',post(attempt()),actorB)).status,409);
 const second=await invoke(env,'/api/fingers/v0/readings',post(attempt({hand_label:'Another hand',act:'dissent',replies_to:first.body.reading_id,request_key:'41589b2b-cdc5-4f56-b330-ffdfc77f36ae'})),actorB);
 assert.equal(second.status,200);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM ravel_account_receipts_v0').get().n,2);
 const view=await invoke(env,'/api/fingers/v0');
 assert.equal(view.body.total_readings,4);
 assert.equal(view.body.readings.filter(r=>r.account_authenticated).length,2);
 assert.equal(db.prepare('SELECT represented_words AS s FROM ravel_spans_v0 WHERE span_id=?').get('ravel-fictional-westford-council').s,original);
});
test('invalid hand, scope, method, request key, forged role and origin refused',async()=>{
 const {db,env}=setup();
 for(const change of [{hand_label:''},{pair_id:'historical-source'},{act:'delete'},{act:'dissent'},{request_key:'bad'},{is_verified:true},{reading:'x'.repeat(2001)}]){
  const result=await invoke(env,'/api/fingers/v0/readings',post(attempt(change)));
  assert.equal(result.status,400,JSON.stringify(change).slice(0,60));
 }
 assert.equal((await invoke(env,'/api/fingers/v0/readings',post(attempt(),'https://outside.example'))).status,403);
 assert.equal((await invoke(env,'/api/fingers/v0?offset=-1')).status,400);
 assert.equal((await invoke(env,'/api/fingers/v0/readings')).status,404);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM ravel_readings_v0').get().n,2);
});
test('foreign-key refusal is atomic and original words are immutable',async()=>{
 const {db,env}=setup();
 const bad=await invoke(env,'/api/fingers/v0/readings',post(attempt({act:'dissent',replies_to:'not-found'})));
 assert.equal(bad.status,409);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM ravel_account_receipts_v0').get().n,0);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM ravel_readings_v0').get().n,2);
 assert.throws(()=>db.prepare("UPDATE ravel_spans_v0 SET represented_words='changed'").run(),/ravel_span_immutable/);
 assert.equal(db.prepare('SELECT represented_words AS s FROM ravel_spans_v0 WHERE span_id=?').get('ravel-fictional-westford-council').s,original);
});
test('withdrawal appends a competing state without deleting source or prior dissent',async()=>{
 const {db,env}=setup();
 const w=await invoke(env,'/api/fingers/v0/readings',post(attempt({act:'withdraw',replies_to:'ravel-fictional-reading-ravel',request_key:'96081cde-13e1-4ea5-8d7c-c9d0f98d8aae'})));
 assert.equal(w.status,200);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM ravel_readings_v0').get().n,3);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM ravel_spans_v0').get().n,2);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM ravel_readings_v0 WHERE reading_id=?').get('ravel-fictional-reading-second').n,1);
});