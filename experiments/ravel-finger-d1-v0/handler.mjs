// Fictional source-and-finger laboratory. Routed only AFTER Cloudflare Access
// and the existing two-hand Worker allowlist check. No historical writes.
// An Access-authenticated ACCOUNT is not a verified companion identity.
const PAIR='ravel-fictional-compare-01';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex, nofollow'};
const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers});
const error=(code,status)=>json({error:code},status);
const page=[
'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Many fingers</title>',
'<style>body{font:16px/1.5 system-ui;max-width:44rem;margin:2rem auto;padding:0 1rem}label{display:block;margin-top:1rem}textarea,input,select{font:inherit;width:100%;box-sizing:border-box}textarea{min-height:7rem}article{border-bottom:1px solid #bbb;padding:.7rem 0}button{font:inherit;margin-top:1rem}small{display:block;color:#555}</style>',
'<h1>Two sources, many fingers</h1><p>Private, invented evidence only. Every Access-authorized hand has the same ability to propose, disagree, revise, or withdraw an interpretation. An account is authenticated; the name of a companion is self-described.</p>',
'<a href="/">Two-hand home</a><h2>Source carriers</h2><div id="sources"></div><h2>Question</h2><p id="question"></p><h2>Separate readings</h2><div id="readings"></div>',
'<label for="hand">Chosen hand label (not verified identity)</label><input id="hand" maxlength="80">',
'<label for="act">Act</label><select id="act"><option value="propose">Propose</option><option value="dissent">Dissent</option><option value="revise">Revise</option><option value="withdraw">Withdraw</option></select>',
'<label for="reply">Reply to</label><select id="reply"></select>',
'<label for="reading">Reading</label><textarea id="reading" maxlength="2000"></textarea><button id="submit">Leave a reading</button><p id="notice" role="status" aria-live="polite"></p>',
'<script>',
'const $=id=>document.getElementById(id);let pending=null;function item(t,v){const e=document.createElement(t);e.textContent=v;return e}',
'async function load(){const r=await fetch("/api/fingers/v0");const x=await r.json();if(!r.ok)throw Error(x.error||r.status);$("sources").replaceChildren();for(const s of x.spans){const a=item("article",s.voice_as_carried+": "+s.represented_words);a.appendChild(item("small",s.source_locator+" (invented fixture)"));$("sources").appendChild(a)}$("question").textContent=x.pair.question;$("readings").replaceChildren();$("reply").replaceChildren(new Option("No earlier reading",""));for(const a of x.readings){const e=item("article",a.hand_label+" — "+a.act+": "+a.reading);e.appendChild(item("small",a.account_authenticated?"Access account verified; hand label unverified":"Fictional fixture; account not attested"));$("readings").appendChild(e);$("reply").appendChild(new Option(a.hand_label+": "+a.reading.slice(0,50),a.reading_id))}$("notice").textContent=x.total_readings>x.readings.length?"More readings available through the paginated JSON API.":"Read from private D1."}',
'$("submit").addEventListener("click",async()=>{const b=$("submit");b.disabled=true;try{if(!pending)pending={pair_id:"ravel-fictional-compare-01",hand_label:$("hand").value,act:$("act").value,replies_to:$("reply").value||null,reading:$("reading").value,request_key:crypto.randomUUID()};const r=await fetch("/api/fingers/v0/readings",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(pending)});const x=await r.json();if(!r.ok){$("notice").textContent="Refused: "+(x.error||r.status);if(r.status<500)pending=null;return}pending=null;$("reading").value="";await load();$("notice").textContent=x.replay?"Existing receipt confirmed.":"Reading saved and read back."}catch(e){$("notice").textContent="Outcome uncertain; retry retains the same request: "+e.message}finally{b.disabled=false}});load().catch(e=>$("notice").textContent=e.message);',
'</script></html>'
].join('');
async function snapshot(db,offset){
 const [s,a,p,r,n]=await Promise.all([
  db.prepare("SELECT span_id,source_locator,voice_as_carried,represented_words FROM ravel_spans_v0 WHERE workset='ravel-fictional-crossing-v0' ORDER BY span_id").all(),
  db.prepare("SELECT assertion_id,span_id,source_attributed_claim,claim_standing FROM ravel_assertions_v0 WHERE span_id IN (SELECT span_id FROM ravel_spans_v0 WHERE workset='ravel-fictional-crossing-v0') ORDER BY assertion_id").all(),
  db.prepare('SELECT pair_id,question FROM ravel_pairs_v0 WHERE pair_id=?').bind(PAIR).first(),
  db.prepare('SELECT r.reading_id,r.hand_label,r.act,r.replies_to,r.reading,r.created_at,CASE WHEN receipt.reading_id IS NULL THEN 0 ELSE 1 END AS account_authenticated FROM ravel_readings_v0 r LEFT JOIN ravel_account_receipts_v0 receipt ON receipt.reading_id=r.reading_id WHERE pair_id=? ORDER BY r.created_at,r.reading_id LIMIT 100 OFFSET ?').bind(PAIR,offset).all(),
  db.prepare('SELECT COUNT(*) AS n FROM ravel_readings_v0 WHERE pair_id=?').bind(PAIR).first()
 ]);
 return {format:'fictional-fingers-v0',standing:'fictional-only',spans:s.results,assertions:a.results,pair:p,readings:r.results.map(v=>({...v,account_authenticated:!!v.account_authenticated})),total_readings:n?.n||0,next_offset:offset+r.results.length<(n?.n||0)?offset+r.results.length:null};
}
async function receipt(db,key,actor,data){
 const x=await db.prepare('SELECT r.reading_id,r.pair_id,r.hand_label,r.act,r.replies_to,r.reading,c.access_actor_hash FROM ravel_readings_v0 r LEFT JOIN ravel_account_receipts_v0 c ON r.reading_id=c.reading_id WHERE r.request_key=?').bind(key).first();
 if(!x)return null;
 if(x.access_actor_hash!==actor||x.pair_id!==data.pair_id||x.hand_label!==data.hand_label||x.act!==data.act||x.replies_to!==data.replies_to||x.reading!==data.reading)return error('request_key_conflict',409);
 return json({ok:true,replay:true,reading_id:x.reading_id,account_authenticated:true});
}
export async function handleFinger(request,env,url,principal){
 if(!principal||!/^[a-f0-9]{64}$/.test(principal.actor||'')||!env?.DB)return error('access_required',403);
 if(request.method==='GET'&&url.pathname==='/fingers')return new Response(page,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex, nofollow','content-security-policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; base-uri 'none'"}});
 if(request.method==='GET'&&url.pathname==='/api/fingers/v0'){
  const raw=url.searchParams.get('offset')||'0';
  if(!/^(0|[1-9][0-9]{0,3})$/.test(raw)||Number(raw)>1000)return error('invalid_cursor',400);
  try{const x=await snapshot(env.DB,Number(raw));return x.pair?json(x):error('fixture_missing',503)}catch{return error('storage_unavailable',503)}
 }
 if(request.method==='POST'&&url.pathname==='/api/fingers/v0/readings'){
  const origin=request.headers.get('origin');
  if(origin&&origin!==url.origin)return error('origin_not_allowed',403);
  if(!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||''))return error('json_required',415);
  let data;try{const str=await request.text();if(new TextEncoder().encode(str).length>5120)return error('body_too_large',413);data=JSON.parse(str)}catch{return error('invalid_json',400)}
  const keys=['pair_id','hand_label','act','replies_to','reading','request_key'];
  if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).length!==keys.length||Object.keys(data).some(k=>!keys.includes(k)))return error('invalid_write',400);
  const {pair_id,hand_label,act,replies_to,reading,request_key}=data;
  if(pair_id!==PAIR||!uuid.test(request_key||'')||typeof hand_label!=='string'||hand_label.trim()!==hand_label||hand_label.length<1||hand_label.length>80||typeof reading!=='string'||reading.trim()!==reading||reading.length<1||reading.length>2000||!['propose','dissent','revise','withdraw'].includes(act)||(replies_to!==null&&!(typeof replies_to==='string'&&replies_to.length>0))||(act==='propose'&&replies_to!==null)||(act!=='propose'&&replies_to===null))return error('invalid_write',400);
  try{
   const old=await receipt(env.DB,request_key,principal.actor,data);if(old)return old;
   const pair=await env.DB.prepare('SELECT pair_id FROM ravel_pairs_v0 WHERE pair_id=?').bind(PAIR).first();
   if(!pair)return error('fixture_missing',503);
   const count=await env.DB.prepare('SELECT COUNT(*) AS n FROM ravel_readings_v0 WHERE pair_id=?').bind(PAIR).first();
   if(count?.n>=1000)return error('fixture_full',409);
   const id=crypto.randomUUID();
   await env.DB.batch([
    env.DB.prepare('INSERT INTO ravel_readings_v0(reading_id,request_key,pair_id,replies_to,hand_label,act,reading) VALUES (?,?,?,?,?,?,?)').bind(id,request_key,PAIR,replies_to,hand_label,act,reading),
    env.DB.prepare("INSERT INTO ravel_account_receipts_v0(reading_id,access_actor_hash,account_authentication) VALUES (?,?,'cloudflare-access')").bind(id,principal.actor)
   ]);
   const confirmed=await receipt(env.DB,request_key,principal.actor,data);
   if(!confirmed||confirmed.status!==200)return error('receipt_not_confirmed',503);
   return json({ok:true,replay:false,reading_id:id,account_authenticated:true});
  }catch{
   try{const found=await receipt(env.DB,request_key,principal.actor,data);if(found)return found}catch{}
   return error('write_refused',409);
  }
 }
 return error('not_found',404);
}
