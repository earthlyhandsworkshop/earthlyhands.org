import { profileFor, classifyAccount, handleIdentity } from './identity-profiles.mjs';
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
function bounded(value,max,multiline=false){
  if(typeof value!=='string')return '';
  const clean=value.trim();
  if(!clean||clean.length>max||(multiline ? /[\u0000-\u0008\u000b-\u001f]/u.test(clean) : /[\u0000-\u001f]/u.test(clean)))return '';
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
function cleanRecord(data,profile){
  if(!data||typeof data!=='object'||Array.isArray(data))return null;
  const by=profile ? profile.name : bounded(data.noticed_by,80);
  if(profile&&data.noticed_by!==undefined&&String(data.noticed_by).trim()!==profile.name)return null;
  const hand=bounded(data.noticed_hand,80);
  const moment=bounded(data.moment,1000,true);
  const road=bounded(data.source_label,160);
  const url=sourceUrl(data.source_url);
  const key=data.request_key;
  if(!by||!hand||!moment||!road||!url||!uuid(key)||by.toLowerCase()===hand.toLowerCase())return null;
  return {noticed_by:by,noticed_hand:hand,moment,source_label:road,source_url:url,request_key:key.toLowerCase(),observer_profile_id:profile?.id??null};
}
async function insert(db,record,actor){
  // The D1 unique request key makes a network retry refer to the same act.
  // On conflict, compare all original bytes and the authenticated submitter.
  await db.prepare(
    'INSERT INTO caught_moments_v1 (id, request_key, noticed_by, noticed_hand, moment, source_label, source_url, actor_hash, observer_profile_id) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(request_key) DO NOTHING'
  ).bind(crypto.randomUUID(),record.request_key,record.noticed_by,record.noticed_hand,record.moment,record.source_label,record.source_url,actor,record.observer_profile_id).run();
  const saved=await db.prepare('SELECT id, request_key, noticed_by, noticed_hand, moment, source_label, source_url, actor_hash, observer_profile_id, created_at FROM caught_moments_v1 WHERE request_key=?').bind(record.request_key).first();
  if(!saved)return reject('receipt_unavailable',503);
  if(saved.actor_hash!==actor||saved.observer_profile_id!==record.observer_profile_id||['noticed_by','noticed_hand','moment','source_label','source_url'].some(k=>saved[k]!==record[k])){
    return reject('request_key_already_used',409);
  }
  const {actor_hash,request_key,...publicReceipt}=saved;
  return response({ok:true,receipt:{...publicReceipt,identity_kind:saved.observer_profile_id?'account-linked':'shared-account-assertion'}},201);
}
const PAGE_SIZE=40;
const PAGE_FIELDS="id,noticed_by,noticed_hand,moment,source_label,source_url,created_at,CASE WHEN observer_profile_id IS NOT NULL THEN 'account-linked' ELSE 'shared-account-assertion' END AS identity_kind";
function readCursor(url){
  const values=url.searchParams.getAll('before');
  if(values.length>1)return null;
  if(!values.length)return {createdAt:null,id:null};
  const match=/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)~([0-9a-fA-F-]{36})$/.exec(values[0]);
  if(!match||!uuid(match[2]))return null;
  return {createdAt:match[1],id:match[2].toLowerCase()};
}
async function list(db,url){
  const before=readCursor(url);
  if(!before)return reject('invalid_cursor',400);
  // Keyset pagination keeps earlier observations reachable even when new ones arrive.
  // Timestamp and ID jointly disambiguate several observations in one millisecond.
  const statement=before.createdAt
    ? db.prepare(`SELECT ${PAGE_FIELDS} FROM caught_moments_v1 WHERE created_at<? OR (created_at=? AND id<?) ORDER BY created_at DESC,id DESC LIMIT ?`)
        .bind(before.createdAt,before.createdAt,before.id,PAGE_SIZE+1)
    : db.prepare(`SELECT ${PAGE_FIELDS} FROM caught_moments_v1 ORDER BY created_at DESC,id DESC LIMIT ?`)
        .bind(PAGE_SIZE+1);
  const rows=(await statement.all()).results;
  const page=rows.slice(0,PAGE_SIZE);
  const last=page.at(-1);
  const nextBefore=rows.length>PAGE_SIZE&&last ? last.created_at+'~'+last.id : null;
  return response({scope:'private-staging',kind:'caught-moment',source_links_unverified:true,items:page,nextBefore});
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
<section aria-label="Moments already noticed"><h2>Little moments</h2><div id="items"></div><button type="button" id="older" hidden>See older moments</button></section>
<script>
const $=id=>document.getElementById(id);
let pending=null, beforeCursor=null, generation=0, loadingOlder=false;
function addText(parent,tag,value){const e=document.createElement(tag);e.textContent=value;parent.appendChild(e);return e}
function showMoment(holder,item){
 const card=document.createElement('article');addText(card,'strong',item.noticed_hand);
 addText(card,'small',' · noticed by '+item.noticed_by+' · '+item.created_at);
 addText(card,'p',item.moment);
 const a=document.createElement('a');a.href=item.source_url;a.rel='noopener noreferrer';a.target='_blank';a.textContent='Return to '+item.source_label;
 card.appendChild(a);holder.appendChild(card);
}
async function load(reset=true){
 const myGeneration=reset?++generation:generation;
 const cursor=reset?null:beforeCursor;
 if(!reset&&(!cursor||loadingOlder))return;
 if(!reset)loadingOlder=true;
 $('older').disabled=true;
 try{
  const r=await fetch('/api/caught'+(cursor?'?before='+encodeURIComponent(cursor):''));
  const x=await r.json();if(!r.ok)throw Error(x.error||'Read failed');
  if(myGeneration!==generation)return;
  const holder=$('items');if(reset)holder.replaceChildren();
  if(reset&&!x.items.length)addText(holder,'p','Nothing caught here yet. Quiet is welcome.');
  for(const item of x.items)showMoment(holder,item);
  beforeCursor=x.nextBefore||null;
  $('older').hidden=!beforeCursor;
 }finally{
  if(!reset)loadingOlder=false;
  if(myGeneration===generation)$('older').disabled=false;
 }
}
$('older').addEventListener('click',()=>load(false).catch(error=>$('status').textContent='Older moments unavailable: '+error.message));
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
  $('capture').reset();
  try{await load();}catch(error){$('status').textContent='Moment was kept, but the shelf did not refresh: '+error.message;}
 }catch(error){
  $('status').textContent='Outcome unknown. Your words remain. Press Keep again to check the same request.';
 }finally{$('keep').disabled=false;}
});
load().catch(error=>$('status').textContent='Unable to read the moments: '+error.message);
</script>
</body></html>`;

export async function handleCaught(request,env,url,principal){
 if(url.pathname==='/api/caught/identity')return handleIdentity(request,env,url,principal);
 if(request.method==='GET'&&url.pathname==='/caught'){
  return new Response(PAGE,{headers:{
    'content-type':'text/html; charset=utf-8','cache-control':'no-store',
    'content-security-policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; base-uri 'none'",
    'x-robots-tag':'noindex, nofollow','x-content-type-options':'nosniff'
  }});
 }
 if(request.method==='GET'&&url.pathname==='/api/caught'){
  try{return await list(env.DB,url);}catch{return reject('collection_unavailable',503);}
 }
 if(request.method==='POST'&&url.pathname==='/api/caught'){
  const origin=request.headers.get('origin');
  if(origin&&origin!==url.origin)return reject('origin_not_allowed',403);
  if(!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||''))return reject('json_required',415);
  let raw;
  try{raw=await request.text();}catch{return reject('body_unavailable',400);}
  if(new TextEncoder().encode(raw).byteLength>MAX_INPUT_BYTES)return reject('body_too_large',413);
  let parsed;try{parsed=JSON.parse(raw);}catch{return reject('invalid_json',400);}
  const mode=classifyAccount(principal.email,env);
  if(mode==='unconfigured')return reject('identity_configuration_missing',503);
  if(mode==='unknown')return reject('identity_not_authorized',403);
  let profile;
  try{profile=await profileFor(env.DB,principal.actor);}catch{return reject('identity_store_unavailable',503);}
  if(mode==='individual'&&!profile)return reject('profile_registration_required',403);
  if(mode==='shared'&&profile)return reject('shared_profile_conflict',403);
  const record=cleanRecord(parsed,profile);
  if(!record)return reject('invalid_caught_moment',400);
  try{return await insert(env.DB,record,principal.actor);}catch{return reject('write_unavailable',503);}
 }
 return reject('not_found',404);
}
