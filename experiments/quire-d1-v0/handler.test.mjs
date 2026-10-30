import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('./handler.mjs', import.meta.url), 'utf8');
const begin = source.indexOf('<script>\n');
const end = source.indexOf('</script>', begin);
assert.ok(begin > 0 && end > begin, 'Worker contains exactly one browser script');
const browserScript = source.slice(begin + '<script>\n'.length, end);

function specimenResponse() {
  return {
    ok: true,
    json: async () => ({
      body: {
        question: 'Which source should we inspect?',
        review: [{id:'case',title:'Invented ticket',text:'Invented text',brake:'Not authority',meta:{source:'invented'}}],
        other: [], brakes: ['OPEN, not a finding']
      }, source_blob_sha:'invented-blob', version_ordinal:1
    })
  };
}
function historyResponse(){
  return {ok:true,json:async()=>({events:[],total_requests:0,next_before:null})};
}

async function browserHarness(postResults) {
  const nodes = new Map();
  const inputs = [];
  function element(tag='div') {
    return {
      tag,children:[],listeners:{},dataset:{},hidden:false,disabled:false,readOnly:false,
      value:'',textContent:'',className:'',
      append(...items) { this.children.push(...items); },
      replaceChildren(...items) { this.children=[...items]; },
      addEventListener(name, fn) { this.listeners[name]=fn; },
      querySelectorAll(selector) {
        if(selector==='.entry')return this.children.filter(x=>x.className==='entry');
        return [];
      }
    };
  }
  const ids=['status','brakes','review','other','question','propose','new-request','retry-note','result','history','history-count','older'];
  for(const id of ids) nodes.set(id,element());
  const document = {
    querySelector(selector){return nodes.get(selector.slice(1));},
    querySelectorAll(selector){
      if(selector==='input[data-ticket]')return inputs.filter(x=>x.dataset.ticket);
      if(selector==='input[data-ticket]:checked')return inputs.filter(x=>x.dataset.ticket&&x.checked);
      throw Error('Unexpected query '+selector);
    },
    createElement(tag){const e=element(tag);if(tag==='input')inputs.push(e);return e;}
  };
  let keyIndex=0;
  const bodies=[];
  async function fetch(url,options) {
    if(url==='/api/quire/v0/specimen')return specimenResponse();
    if(url==='/api/quire/v0/proposals'&&!options)return historyResponse();
    if(url==='/api/quire/v0/proposals'&&options?.method==='POST'){
      bodies.push(JSON.parse(options.body));
      const response=postResults.shift();
      if(response instanceof Error)throw response;
      return response;
    }
    throw Error('Unexpected fetch '+url);
  }
  const confirmations=[];
  let confirmResult=false;
  const context={document,fetch,crypto:{randomUUID:()=>('00000000-0000-4000-8000-'+String(++keyIndex).padStart(12,'0'))},
    confirm:(message)=>{confirmations.push(message);return confirmResult;},
    Date,URL,JSON,Promise,console};
  runInNewContext(browserScript,context);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(nodes.get('propose').disabled,false,'specimen loaded');
  assert.equal(inputs.length,1);
  inputs[0].checked=true;
  return {
    nodes,inputs,bodies,confirmations,
    keys:()=>keyIndex,
    confirmNext:(bool)=>{confirmResult=bool;},
    click:()=>nodes.get('propose').listeners.click(),
    newRequest:()=>nodes.get('new-request').listeners.click()
  };
}
const ok=(replay=false)=>({ok:true,json:async()=>({replay,proposal:{state:'OPEN',proposed_test:'Invented next test'}})});
const pending=()=>({ok:false,json:async()=>({error:'request_still_pending'})});

test('uncertain response, HTTP pending and replay all use one request key and identical input',async()=>{
  const b=await browserHarness([new Error('lost_response'),pending(),ok(true),ok(false)]);
  const firstQuestion=b.nodes.get('question').value;
  await b.click();
  assert.equal(b.bodies.length,1);
  assert.equal(b.nodes.get('new-request').hidden,false);
  assert.equal(b.nodes.get('propose').textContent,'Retry same request');
  assert.equal(b.nodes.get('question').readOnly,true);
  assert.equal(b.keys(),1);
  await b.click();
  await b.click();
  assert.deepEqual(b.bodies.slice(0,3).map(x=>JSON.stringify(x)),Array(3).fill(JSON.stringify(b.bodies[0])));
  assert.equal(b.bodies[0].question,firstQuestion);
  assert.equal(b.keys(),1);
  assert.equal(b.nodes.get('new-request').hidden,true);
  assert.equal(b.nodes.get('question').readOnly,false);
  await b.click();
  assert.notEqual(b.bodies[3].request_key,b.bodies[0].request_key);
  assert.equal(b.keys(),2);
});
test('new question requires explicit confirmation while retry may be in flight',async()=>{
  const b=await browserHarness([new Error('lost_response'),ok(false)]);
  await b.click();
  b.confirmNext(false);
  b.newRequest();
  assert.equal(b.nodes.get('new-request').hidden,false);
  assert.equal(b.nodes.get('question').readOnly,true);
  b.confirmNext(true);
  b.newRequest();
  assert.equal(b.nodes.get('new-request').hidden,true);
  assert.equal(b.nodes.get('question').readOnly,false);
  await b.click();
  assert.notEqual(b.bodies[0].request_key,b.bodies[1].request_key);
  assert.equal(b.confirmations.length,2);
});
test('history cursor follows immutable request identity, not a newly completed result identity',()=>{
  assert.match(source,/requested_at AS created_at,resolved_at FROM quire_operator_history_v0/);
  assert.match(source,/requested_at<\? OR \(requested_at=\? AND request_id<\?\)/);
  assert.match(source,/ORDER BY requested_at DESC,request_id DESC LIMIT 31/);
  assert.doesNotMatch(source,/ORDER BY event_at DESC,event_id DESC LIMIT 31/);
});
