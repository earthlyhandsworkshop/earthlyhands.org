import { handleCaught } from './caught-moments.mjs';
// One reversible two-person Cloudflare D1 crossing. Fictional content only.
// This is NOT the public site or a deployed Workshop service.
const ID = 'fictional-door';
const MAX_BYTES = 8192;
const MAX_VERSION = 100;
const MAX_EVENTS = 50;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow',
    'x-content-type-options': 'nosniff'
  } });
}
function error(code, status) { return json({ error: code }, status); }
function emailOf(identity) { return String(identity?.email || '').trim().toLowerCase(); }
function permittedEmails(raw) {
  return [...new Set(String(raw || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean))];
}
async function actorId(email, salt) {
  const bytes = new TextEncoder().encode(salt + ':' + email);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join('');
}
function checkRequestId(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
function allowedOrigin(request) {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}
async function state(db) {
  return db.prepare('SELECT id, version, body FROM shared_fixture WHERE id=?').bind(ID).first();
}
async function history(db, after = 0) {
  const result = await db.prepare('SELECT version, body, actor, request_key, changed_at FROM shared_fixture_history WHERE id=? AND version>? ORDER BY version ASC LIMIT ?').bind(ID, after, MAX_EVENTS).all();
  return result.results;
}
async function write(db, body, expectedVersion, requestId, actor) {
  let applied = false;
  try {
    // The trigger writes the exact revision receipt in the same SQLite transaction.
    const result = await db.prepare('UPDATE shared_fixture SET version=version+1, body=?, last_actor=?, last_request_key=? WHERE id=? AND version=? AND version<?')
      .bind(body, actor, requestId, ID, expectedVersion, MAX_VERSION).run();
    applied = Boolean(result.success && Number(result.meta?.changes) > 0);
  } catch {
    // A reused idempotency key may have aborted the UPDATE transaction.
    // Read the durable receipt before distinguishing replay from conflict.
  }
  const receipt = await db.prepare('SELECT version, body, actor FROM shared_fixture_history WHERE request_key=?').bind(requestId).first();
  if (receipt && receipt.actor === actor && receipt.body === body && receipt.version === expectedVersion + 1) {
    return json({ ok: true, replay: !applied, acceptedVersion: receipt.version, state: await state(db) });
  }
  const current = await state(db);
  if (current?.version === MAX_VERSION) return error('fixture_capacity_reached', 409);
  return json({ error: 'stale_or_reused_request', currentVersion: current?.version }, 409);
}

const PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Two hands, one fictional page</title><style>body{font:16px/1.5 system-ui;max-width:43rem;margin:2rem auto;padding:0 1rem}textarea{box-sizing:border-box;width:100%;min-height:11rem;font:inherit}button,a{font:inherit;margin:0.5rem 0.5rem 0.5rem 0}pre{white-space:pre-wrap;overflow-wrap:anywhere}button:focus-visible,textarea:focus-visible{outline:3px solid #4678b6}</style></head><body><h1>Two hands, one fictional page</h1><p><a href="/caught">Caught here — notice another hand</a></p><p>Private staging experiment. Nothing here is a historical source or public publication. Sign in separately from two browsers and take turns saving. The other browser must refresh to see the new revision. Stale saves are refused, not overwritten.</p><p id="rev" aria-live="polite">Loading...</p><textarea id="body" aria-label="Fictional shared page"></textarea><div><button id="save">Save expected revision</button><button id="refresh">Refresh shared page</button><button id="export">Export history</button></div><pre id="status" role="status" aria-live="polite"></pre><script type="module">let version=null;let savedBody=null;let saving=false;let pendingSave=null;const $=id=>document.getElementById(id);async function load(){if(pendingSave){$('status').textContent='Refresh refused: a previous save is awaiting confirmation. Press Save to retry it first.';return;}const beforeVersion=version;const beforeSaved=savedBody;const beforeText=$('body').value;if((beforeVersion===null&&beforeText!=='')||(beforeVersion!==null&&beforeText!==beforeSaved)){$('status').textContent='Refresh refused: unsaved writing is in the box. Save or copy it first.';return;}const r=await fetch('/api/state');const x=await r.json();if(!r.ok)throw new Error(x.error||'Read failed');if(version!==beforeVersion||savedBody!==beforeSaved||$('body').value!==beforeText){$('status').textContent='Not refreshed: writing or saved revision changed while the read was in progress.';return;}version=x.version;savedBody=x.body;$('body').value=x.body;$('rev').textContent='Server revision '+version;$('status').textContent='Read from the shared database.';}async function save(){
if(version===null){$('status').textContent='Cannot save before the first server revision loads. Copy your draft words before clearing the box, then Refresh shared page and paste them back.';return;}if(saving)return;
saving=true;
if(!pendingSave)pendingSave={body:$('body').value,expectedVersion:version,requestId:crypto.randomUUID()};
const attempt=pendingSave;
try{
 const r=await fetch('/api/state',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(attempt)});
 const x=await r.json();
 if(!r.ok){
   if((r.status===409&&['stale_or_reused_request','fixture_capacity_reached'].includes(x.error))||(r.status===400&&x.error==='invalid_write'))pendingSave=null;
   $('status').textContent='Save was refused: '+(x.error||r.status)+'. Current server revision: '+(x.currentVersion??'unknown')+'. Your writing remains in the box.';
   return;
 }
 if(!Number.isSafeInteger(x.acceptedVersion)||x.acceptedVersion!==attempt.expectedVersion+1)throw new Error('Unverified save receipt');
 pendingSave=null;
 version=x.acceptedVersion;
 savedBody=attempt.body;
 $('rev').textContent='Your saved revision '+version;
 $('status').textContent=$('body').value!==attempt.body?'Earlier words saved; newer unsaved writing remains in the box. Save again for those words.':x.state?.version!==x.acceptedVersion?'Your revision saved, but another hand has edited since; refresh before writing again.':x.replay?'Previously attempted save confirmed.':'Saved in shared database.';
}catch(error){
 $('status').textContent='Save outcome unknown: the server might already have accepted it. Your words remain here. Press Save again to retry the exact same request; do not refresh.';
}finally{saving=false;}
}async function getExport(){const r=await fetch('/api/export');const x=await r.json();if(!r.ok)throw new Error(x.error||'Export failed');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(x,null,2)],{type:'application/json'}));a.download='two-hand-fictional-history.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}for(const [id,fn] of [['save',save],['refresh',load],['export',getExport]])$(id).addEventListener('click',()=>fn().catch(e=>$('status').textContent=e.message));load().catch(e=>$('status').textContent=e.message);</script></body></html>`;

export async function handleTwoHand(request, env, ctx) {
  // Cloudflare Access is server-side identity. Client-provided identity is ignored.
  if (!ctx?.access) return error('access_required', 403);
  let identity;
  try { identity = await ctx.access.getIdentity(); } catch { return error('identity_unavailable', 403); }
  const allowed = permittedEmails(env?.TWO_HAND_ALLOWED_EMAILS);
  if (allowed.length < 2 || !String(env?.TWO_HAND_ACTOR_SALT || '').trim()) return error('staging_identity_configuration_missing', 503);
  const email = emailOf(identity);
  if (!email || !allowed.includes(email)) return error('not_authorized', 403);
  if (!env?.DB) return error('staging_database_unavailable', 503);
  const url = new URL(request.url);
  if (url.pathname === '/caught' || url.pathname === '/api/caught' || url.pathname === '/api/caught/identity') {
    return handleCaught(request, env, url, {
      email,
      actor: await actorId(email, env.TWO_HAND_ACTOR_SALT)
    });
  }
  if (request.method === 'GET' && url.pathname === '/') return new Response(PAGE, { headers: { 'content-type':'text/html; charset=utf-8', 'cache-control':'no-store', 'content-security-policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self';", 'x-robots-tag':'noindex, nofollow' } });
  if (request.method === 'GET' && url.pathname === '/api/state') {
    const current = await state(env.DB);
    return current ? json(current) : error('fixture_not_initialized', 503);
  }
  if (request.method === 'GET' && url.pathname === '/api/history') {
    const after = Number(url.searchParams.get('after') || 0);
    if (!Number.isSafeInteger(after) || after < 0 || after > MAX_VERSION) return error('invalid_cursor', 400);
    const events = await history(env.DB, after);
    return json({ events, nextAfter: events.length ? events.at(-1).version : after });
  }
  if (request.method === 'GET' && url.pathname === '/api/export') {
    const current = await state(env.DB);
    if (!current) return error('fixture_not_initialized', 503);
    const all = [...await history(env.DB, 0), ...await history(env.DB, MAX_EVENTS)];
    const check = await state(env.DB);
    if (check?.version !== current.version || all.length !== current.version) return error('export_changed_retry', 409);
    return json({ format:'two-hand-fictional-v1', state:current, history:all });
  }
  if (request.method === 'PUT' && url.pathname === '/api/state') {
    if (!allowedOrigin(request)) return error('origin_not_allowed', 403);
    if (!/^application\/json(?:;|$)/i.test(request.headers.get('content-type') || '')) return error('json_required', 415);
    let payload;
    try { payload = await request.json(); } catch { return error('invalid_json', 400); }
    if (typeof payload?.body !== 'string' || new TextEncoder().encode(payload.body).byteLength > MAX_BYTES || !Number.isSafeInteger(payload.expectedVersion) || payload.expectedVersion < 0 || !checkRequestId(payload.requestId)) return error('invalid_write', 400);
    const actor = await actorId(email, env.TWO_HAND_ACTOR_SALT);
    return write(env.DB, payload.body, payload.expectedVersion, payload.requestId, actor);
  }
  return error('not_found', 404);
}
export default { fetch: handleTwoHand };
