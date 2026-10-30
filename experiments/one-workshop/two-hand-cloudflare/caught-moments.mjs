// Small private staging aperture for one hand noticing another.
// It writes NO source files, grants NO source rights, and publishes NOTHING.
// The observer's display label is an assertion by the authenticated submitter,
// not a second authenticated companion identity or historical assertion.
const MAX_INPUT_BYTES = 8192;
const SOURCE_HOSTS = new Set(['drive.google.com','docs.google.com','github.com','earthlyhands.org','www.earthlyhands.org']);

function response(body,status=200){
  return new Response(JSON.stringify(body),{status,headers:{
    'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store','x-robots-tag':'noindex, nofollow',
    'x-content-type-options':'nosniff'
  }});
}
function reject(reason,status=400){return response({error:reason},status);}
function bounded(value,max){
  if(typeof value!=='string')return '';
  const clean=value.trim();
  if(!clean||clean.length>max||/[\u0000-\u001f]/u.test(clean))return '';
  return clean;
}
function uuid(value){
  return typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
function sourceUrl(value){
  if(typeof value!=='string'||value.length>1200)return '';
  try{
    const u=new URL(value);
    if(u.protocol!=='https:'||u.username||u.password||u.port||!SOURCE_HOSTS.has(u.hostname.toLowerCase())||u.pathname==='/')return '';
    return u.href;
  }catch{return '';}
}
function cleanRecord(data){
  if(!data||typeof data!=='object'||Array.isArray(data))return null;
  const by=bounded(data.noticed_by,80);
  const hand=bounded(data.noticed_hand,80);
  const moment=bounded(data.moment,1000);
  const road=bounded(data.source_label,160);
  const url=sourceUrl(data.source_url);
  const key=data.request_key;
  if(!by||!hand||!moment||!road||!url||!uuid(key)||by.toLowerCase()===hand.toLowerCase())return null;
  return {noticed_by:by,noticed_hand:hand,moment,source_label:road,source_url:url,request_key:key.toLowerCase()};
}
async function insert(db,record,actor){
  // The D1 unique request key makes a network retry refer to the same act.
  // On conflict, compare all original bytes and the authenticated submitter.
  await db.prepare(
    'INSERT INTO caught_moments_v1 (id, request_key, noticed_by, noticed_hand, moment, source_label, source_url, actor_hash) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(request_key) DO NOTHING'
  ).bind(crypto.randomUUID(),record.request_key,record.noticed_by,record.noticed_hand,record.moment,record.source_label,record.source_url,actor).run();
  const saved=await db.prepare('SELECT id, request_key, noticed_by, noticed_hand, moment, source_label, source_url, actor_hash, created_at FROM caught_moments_v1 WHERE request_key=?').bind(record.request_key).first();
  if(!saved)return reject('receipt_unavailable',503);
  if(saved.actor_hash!==actor||['noticed_by','noticed_hand','moment','source_label','source_url'].some(k=>saved[k]!==record[k])){
    return reject('request_key_already_used',409);
  }
  const {actor_hash,request_key,...publicReceipt}=saved;
  return response({ok:true,receipt:publicReceipt},201);
}
async function list(db){
  const rows=await db.prepare(
    'SELECT id,noticed_by,noticed_hand,moment,source_label,source_url,created_at FROM caught_moments_v1 ORDER BY created_at DESC,id DESC LIMIT 40'
  ).all();
  return response({scope:'private-staging',kind:'caught-moment',source_links_unverified:true,items:rows.results});
}

const PAGE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Caught here — Earthly Hands</title>
<style>
:root{font-family:ui-sans-serif,system-ui,sans-serif;color-scheme:light dark}
body{max-width:760px;margin:auto;padding:20px 16px 60px;line-height:1.5}
header{border-bottom:1px solid #9997;padding-bottom:18px}
h1{font-family:ui-serif,Georgia,serif;font-weight:normal}
p.small,small{font-size:.89rem;color:gray}
label{display:block;margin:12px 0 5px;font-weight:600}
input,textarea{box-sizing:border-box;width:100%;font:inherit;padding:10px;border:1px solid #9999;border-radius:7px;background:transparent;color:inherit}
textarea{min-height:104px;resize:vertical}
button{font:inherit;padding:10px 17px;margin-top:15px;cursor:pointer}
button:disabled{opacity:.6}
article{border:1px solid #9996;border-radius:8px;padding:13px 16px;margin:14px 0;overflow-wrap:anywhere}
article p{white-space:pre-wrap}
article a{overflow-wrap:anywhere}
button:focus-visible,input:focus-visible,textarea:focus-visible,a:focus-visible{outline:3px solid #4280ac}
</style></head>
<body>
<header>
<h1>Caught here</h1>
<p>Sometimes another hand does something worth noticing. Leave a little moment, and the road back to the work. It needn't become an assignment, a verdict, or a permanent description of anybody.</p>
<p class="small">Private staging room. Each entry is an observation by its stated catcher, submitted through an authorized account. The display name is not independently authenticated as a companion identity. Links retain their original permissions. Nothing here is public publication or a historical finding.</p>
<p><a href="/">Return to the two-hand test page</a></p>
</header>
<form id="capture">
<label for="by">Who noticed it?</label><input id="by" maxlength="80" required placeholder="Your chosen name">
<label for="hand">Whose work or moment caught your attention?</label><input id="hand" maxlength="80" required placeholder="Another hand">
<label for="moment">What caught you?</label><textarea id="moment" maxlength="1000" required placeholder="A small, particular observation. No praise required."></textarea>
<label for="road">Title of the original work</label><input id="road" maxlength="160" required placeholder="An exact enough return road">
<label for="url">Link to that work</label><input id="url" type="url" required placeholder="https://drive.google.com/..." maxlength="1200">
<button id="keep" type="submit">Keep this moment</button>
<p id="status" role="status" aria-live="polite"></p>
</form>
<section aria-label="Moments already noticed"><h2>Little moments</h2><div id="items"></div></section>
<script>
const $=id=>document.getElementById(id);
let pending=null;
function addText(parent,tag,value){const e=document.createElement(tag);e.textContent=value;parent.appendChild(e);return e}
async function load(){
 const r=await fetch('/api/caught');const x=await r.json();if(!r.ok)throw Error(x.error||'Read failed');
 const holder=$('items');holder.replaceChildren();
 if(!x.items.length)addText(holder,'p','Nothing caught here yet. Quiet is welcome.');
 for(const item of x.items){
  const card=document.createElement('article');addText(card,'strong',item.noticed_hand);
  addText(card,'small',' · noticed by '+item.noticed_by+' · '+item.created_at);
  addText(card,'p',item.moment);
  const a=document.createElement('a');a.href=item.source_url;a.rel='noopener noreferrer';a.target='_blank';a.textContent='Return to '+item.source_label;
  card.appendChild(a);holder.appendChild(card);
 }
}
$('capture').addEventListener('submit',async event=>{
 event.preventDefault();$('keep').disabled=true;
 if(!pending)pending={
  request_key:crypto.randomUUID(),noticed_by:$('by').value,noticed_hand:$('hand').value,
  moment:$('moment').value,source_label:$('road').value,source_url:$('url').value
 };
 try{
  const r=await fetch('/api/caught',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(pending)});
  const x=await r.json();
  if(!r.ok){$('status').textContent='Not kept: '+(x.error||r.status)+'. Your words are still in the form.';if(r.status===400||r.status===409)pending=null;return;}
  pending=null;$('status').textContent='Kept with a road back. No original work was moved.';
  $('capture').reset();await load();
 }catch(error){
  $('status').textContent='Outcome unknown. Your words remain. Press Keep again to check the same request.';
 }finally{$('keep').disabled=false;}
});
load().catch(error=>$('status').textContent='Unable to read the moments: '+error.message);
</script>
</body></html>`;

export async function handleCaught(request,env,url,actor){
 if(request.method==='GET'&&url.pathname==='/caught'){
  return new Response(PAGE,{headers:{
    'content-type':'text/html; charset=utf-8','cache-control':'no-store',
    'content-security-policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; base-uri 'none'",
    'x-robots-tag':'noindex, nofollow','x-content-type-options':'nosniff'
  }});
 }
 if(request.method==='GET'&&url.pathname==='/api/caught'){
  try{return await list(env.DB);}catch{return reject('collection_unavailable',503);}
 }
 if(request.method==='POST'&&url.pathname==='/api/caught'){
  const origin=request.headers.get('origin');
  if(origin&&origin!==url.origin)return reject('origin_not_allowed',403);
  if(!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||''))return reject('json_required',415);
  let raw;
  try{raw=await request.text();}catch{return reject('body_unavailable',400);}
  if(new TextEncoder().encode(raw).byteLength>MAX_INPUT_BYTES)return reject('body_too_large',413);
  let parsed;try{parsed=JSON.parse(raw);}catch{return reject('invalid_json',400);}
  const record=cleanRecord(parsed);
  if(!record)return reject('invalid_caught_moment',400);
  try{return await insert(env.DB,record,actor);}catch{return reject('write_unavailable',503);}
 }
 return reject('not_found',404);
}
