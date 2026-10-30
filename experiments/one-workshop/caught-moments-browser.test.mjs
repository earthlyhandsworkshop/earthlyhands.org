import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

// Exercise the actual browser code in the committed private doorway, not a reimplementation.
const source=readFileSync(new URL('./two-hand-cloudflare/caught-moments.mjs',import.meta.url),'utf8');
const page=source.match(/const PAGE = \x60([\s\S]*?)\x60;\s*export async function handleCaught/);
assert.ok(page,'the exact committed private-page source must exist');
const script=page[1].match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script,'the committed page must contain its browser behavior');

class Node{
 constructor(tag='div'){
  this.tagName=tag;this.childNodes=[];this.textContent='';this.value='';
  this.hidden=false;this.disabled=false;this.events={};
 }
 appendChild(child){this.childNodes.push(child);return child;}
 replaceChildren(...children){this.childNodes=[...children];}
 addEventListener(type,callback){this.events[type]=callback;}
 reset(){}
}
function browser(fetcher){
 const nodes=new Map();
 for(const id of ['capture','by','hand','moment','road','url','keep','status','items','older'])nodes.set(id,new Node(id));
 nodes.get('older').hidden=true;
 nodes.get('capture').reset=()=>{
  for(const id of ['by','hand','moment','road','url'])nodes.get(id).value='';
 };
 const document={
  getElementById:id=>nodes.get(id),
  createElement:tag=>new Node(tag)
 };
 let key=0;
 runInNewContext(script,{document,fetch:fetcher,crypto:{randomUUID:()=> '10000000-0000-4000-8000-'+String(++key).padStart(12,'0')},encodeURIComponent}, {timeout:2000});
 return {
  nodes,
  older:()=>nodes.get('older').events.click(),
  submit:()=>nodes.get('capture').events.submit({preventDefault(){}}),
  set(id,value){nodes.get(id).value=value;},
  get status(){return nodes.get('status').textContent;},
  get itemCount(){return nodes.get('items').childNodes.length;}
 };
}
function json(body,status=200){return {ok:status>=200&&status<300,status,async json(){return body;}};}
const item=n=>({
 id:'10000000-0000-4000-8000-'+String(n).padStart(12,'0'),
 noticed_by:'Observing hand',noticed_hand:'Another hand',
 moment:'Fictional moment '+n,
 source_label:'Fictional source',
 source_url:'https://github.com/example/repository/blob/main/test.md',
 created_at:'2026-10-30T02:34:34.786Z'
});
async function settle(){await new Promise(resolve=>setImmediate(resolve));}

test('a visitor can reach older moments without replacing the first page',async()=>{
 const cursor='2026-10-30T02:34:34.786Z~10000000-0000-4000-8000-000000000004';
 const calls=[];
 const view=browser(async url=>{
  calls.push(url);
  if(url==='/api/caught')return json({items:Array.from({length:40},(_,i)=>item(50-i)),nextBefore:cursor});
  if(url==='/api/caught?before='+encodeURIComponent(cursor))return json({items:[item(10),item(9)],nextBefore:null});
  throw Error('unexpected read '+url);
 });
 await settle();
 assert.equal(view.itemCount,40);
 assert.equal(view.nodes.get('older').hidden,false);
 await view.older();
 assert.equal(view.itemCount,42);
 assert.equal(view.nodes.get('older').hidden,true);
 assert.deepEqual(calls,['/api/caught','/api/caught?before='+encodeURIComponent(cursor)]);
});

test('committed note is reported as committed even if refreshing the shelf then fails',async()=>{
 let getCount=0,posts=0;
 const view=browser(async(url,options)=>{
  if(url==='/api/caught'&&options?.method==='POST'){
   posts++;
   return json({ok:true,receipt:{id:'caught-01'}},201);
  }
  if(url==='/api/caught'){
   getCount++;
   if(getCount===1)return json({items:[],nextBefore:null});
   return json({error:'collection_unavailable'},503);
  }
  throw Error('unexpected route');
 });
 await settle();
 view.set('by','Observing hand');
 view.set('hand','Another hand');
 view.set('moment','A detail worth catching');
 view.set('road','Source jacket');
 view.set('url','https://github.com/example/repository/blob/main/test.md');
 await view.submit();
 assert.equal(posts,1);
 assert.match(view.status,/Moment was kept, but the shelf did not refresh/);
 assert.doesNotMatch(view.status,/outcome unknown/i);
 assert.equal(view.nodes.get('moment').value,'');
});
