// Private staged account -> Workshop identity binding.
// Cloudflare Access has already authenticated the email in worker.mjs.
// The profile is explicitly opted into by the allowed personal account.
// A shared account never inherits the Ten profile. This does NOT provision
// autonomous companion identities, and does not prove an account holder's body.
const TEN_PROFILE_ID = 'human-ten-v1';

function json(body,status=200){
  return new Response(JSON.stringify(body),{status,headers:{
    'content-type':'application/json; charset=utf-8','cache-control':'no-store',
    'x-robots-tag':'noindex, nofollow','x-content-type-options':'nosniff'
  }});
}
function error(code,status){return json({error:code},status);}
function norm(value){return String(value||'').trim().toLowerCase();}

export function classifyAccount(email,env){
  const ten=norm(env?.CAUGHT_TEN_EMAIL);
  const shared=norm(env?.CAUGHT_SHARED_EMAIL);
  const valid=Boolean(ten && shared && ten!==shared);
  if(!valid)return 'unconfigured';
  if(norm(email)===ten)return 'individual';
  if(norm(email)===shared)return 'shared';
  return 'unknown';
}

export async function profileFor(db,actor){
  const r=await db.prepare('SELECT profile_id,display_name,created_at FROM caught_profiles_v1 WHERE actor_hash=?').bind(actor).first();
  if(!r)return null;
  return {id:r.profile_id,name:r.display_name,created_at:r.created_at,link:'account-backed'};
}

export async function handleIdentity(request,env,url,principal){
  const mode=classifyAccount(principal.email,env);
  if(mode==='unconfigured')return error('identity_configuration_missing',503);
  if(mode==='unknown')return error('identity_not_authorized',403);

  if(request.method==='GET'){
    try{
      const profile=await profileFor(env.DB,principal.actor);
      return json({
        account:{email:principal.email,kind:mode},
        profile,
        enrollment_available:mode==='individual'&&!profile,
        contribution_mode:profile?'account-linked':mode==='shared'?'shared-account-assertion':'registration-required'
      });
    }catch{return error('identity_store_unavailable',503);}
  }

  if(request.method==='POST'){
    // Only a signed-in individual account can link to the Ten profile.
    // A shared credential cannot prove that Ten is holding the camera.
    if(mode!=='individual')return error('personal_account_required',403);
    if(request.headers.get('origin')!==url.origin)return error('origin_not_allowed',403);
    if(!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||''))return error('json_required',415);
    let raw;
    try{raw=await request.text();}catch{return error('body_unavailable',400);}
    if(new TextEncoder().encode(raw).byteLength>512)return error('body_too_large',413);
    let body;try{body=JSON.parse(raw);}catch{return error('invalid_json',400);}
    if(!body||typeof body!=='object'||Array.isArray(body)||
       Object.keys(body).length!==1||body.workshop_name!=='Ten')return error('invalid_profile_choice',400);
    try{
      await env.DB.prepare(
        'INSERT INTO caught_profiles_v1 (profile_id,display_name,actor_hash) VALUES (?,?,?) ON CONFLICT DO NOTHING'
      ).bind(TEN_PROFILE_ID,'Ten',principal.actor).run();
      const found=await profileFor(env.DB,principal.actor);
      if(!found||found.id!==TEN_PROFILE_ID||found.name!=='Ten')return error('profile_claim_conflict',409);
      return json({ok:true,profile:found});
    }catch{return error('identity_registration_unavailable',503);}
  }
  return error('not_found',404);
}
