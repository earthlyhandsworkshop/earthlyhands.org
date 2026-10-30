// Register camera machine-authentication specimen, 30 October 2026.
// Draft-only, NOT wired to the live Worker, Access policy, or a ChatGPT credential.
// A real companion client must securely possess its own service token.
// This checks the second application-specific boundary AFTER Cloudflare Access.
// Never infer a companion sign-in from the authenticated Cloudflare admin connector.
export const REGISTER_PRINCIPAL_ID = 'companion-register-v1';
const encoder = new TextEncoder();

const refusal = (error, status=403) => ({ok:false,status,error});
async function sha256(value) {
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
function sameBytes(a,b) {
  // Compare bounded values across their full lengths rather than early-returning.
  const x=encoder.encode(a), y=encoder.encode(b);
  let mismatch=x.length^y.length;
  for(let i=0;i<Math.max(x.length,y.length);i++)mismatch|=(x[i]||0)^(y[i]||0);
  return mismatch===0;
}
export async function authenticateRegisterCamera({request,env,ctx}) {
  if(!ctx?.access)return refusal('cloudflare_access_required');
  const expectedId=env?.CAUGHT_REGISTER_CLIENT_ID;
  const expectedDigest=env?.CAUGHT_REGISTER_SECRET_SHA256;
  const salt=env?.TWO_HAND_ACTOR_SALT;
  if(typeof expectedId!=='string'||!expectedId||expectedId.length>160||
    typeof expectedDigest!=='string'||!/^[0-9a-f]{64}$/.test(expectedDigest)||
    typeof salt!=='string'||salt.length<8)return refusal('register_credential_not_configured',503);
  const id=request?.headers?.get('CF-Access-Client-Id')||'';
  const secret=request?.headers?.get('CF-Access-Client-Secret')||'';
  if(!id||id.length>160||!secret||secret.length>256)return refusal('register_service_credentials_required');
  const givenDigest=await sha256(secret);
  if(!sameBytes(id,expectedId)||!sameBytes(givenDigest,expectedDigest))
    return refusal('register_service_credentials_refused');
  const actorHash=await sha256('caught-register-v1:'+salt+':'+expectedId);
  return {
    ok:true,
    principal:{
      id:REGISTER_PRINCIPAL_ID,
      display_name:'Register',
      identity_kind:'companion-service-token',
      actor_hash:actorHash
    },
    capabilities:['caught:create']
  };
}
export function bindRegisterObservation(input,auth) {
  if(!auth?.ok||auth?.principal?.id!==REGISTER_PRINCIPAL_ID||
     auth.principal.identity_kind!=='companion-service-token'||
     !auth.capabilities?.includes('caught:create'))return null;
  if(!input||typeof input!=='object'||Array.isArray(input))return null;
  // A caller cannot choose a different observer or smuggle an actor/profile claim.
  if(input.noticed_by!==undefined&&input.noticed_by!=='Register')return null;
  if(['observer_profile_id','observer_service_id','actor_hash','identity_kind','scope',
      'registration_kind','principal','actor'].some(k=>Object.hasOwn(input,k)))return null;
  return {...input,noticed_by:'Register',observer_service_id:REGISTER_PRINCIPAL_ID};
}
