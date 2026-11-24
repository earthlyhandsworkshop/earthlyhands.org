import test from 'node:test';
import assert from 'node:assert/strict';
import { serveConstellationManifest, verifiedWorks } from './constellation-host.mjs';
import { registryWith } from './registry.mjs';

const BASE = 'https://earthly-hands-listening-ground.workshop-1a6.workers.dev';
const URL = BASE + '/folio/workshop/constellations/sample-seven/manifest.json';
const EMAIL = 'visitor@example.test';
const USER = 'private-subject-123';
const REL = 'private:sample';
const REGISTRY = registryWith({
  slug: 'sample-seven', title: 'A Question With Several Roads',
  curator: 'Independent Curator', question: 'Which evidence can distinguish the appearances?',
  description: 'A changing collection of independent works.',
  audience: 'existing_folio_members', source_view: 'test_curatorial_view',
  members_sql: 'SELECT approved_fields FROM test_curatorial_view LIMIT 49',
});
const work = (slug = 'sample-one',ordinal = 1) => ({
  ordinal, curatorial_role: 'source reading', slug,
  title: 'One independently made reading', maker: 'Independent Maker',
  version_label: 'private edition 1',
  protected_reader_road: BASE + '/folio/workshop/native/' + slug,
  sha256: 'a'.repeat(64), audience: 'existing_folio_members',
  state: 'private_approved', effective_visibility: null, edition_sha256: null,
});
async function digest(s) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(bytes), x => x.toString(16).padStart(2,'0')).join('');
}
class DB {
  constructor(works = [work()], active = 1, broken = false) {
    this.works = works; this.active = active; this.broken = broken; this.sql = [];
  }
  prepare(sql) {
    this.sql.push(sql);
    const db = this;
    return {
      bind(...args) { this.args = args; return this; },
      async first() {
        if (db.broken) throw new Error('private DB exception');
        assert.match(sql,/SELECT active FROM folio_memberships/);
        return this.args[0] === REL && this.args[1] === await digest(USER) && db.active != null
          ? { active: db.active } : null;
      },
      async all() {
        if (db.broken) throw new Error('private DB exception');
        assert.match(sql,/test_curatorial_view/);
        return { results: db.works };
      },
    };
  }
}
const environment = (db=new DB()) => ({
  RECEIVING_DB: db, FOLIO_ALLOWED_EMAILS: EMAIL,
  FOLIO_RELATIONSHIPS_JSON: JSON.stringify({[EMAIL]:{id:REL,name:'Folio member'}}),
});
const context = (identity={email:EMAIL,user_uuid:USER}) => ({
  access: { async getIdentity() { return identity; } },
});
const get = (url=URL, env=environment(), ctx=context(), method='GET') =>
  serveConstellationManifest(new Request(url,{method}),env,ctx,{registry:REGISTRY});

test('unrelated public/old paths do not take over the Worker',async()=>{
  assert.equal(await get(BASE+'/folio/'), null);
  assert.equal(await get('https://earthlyhands.org/folio/workshop/constellations/sample-seven/manifest.json'), null);
});
test('unknown slug and visitor table arguments never become SQL',async()=>{
  const db = new DB();
  assert.equal((await get(BASE+'/folio/workshop/constellations/unknown/manifest.json',environment(db))).status,404);
  assert.equal((await get(URL+'?table=secrets',environment(db))).status,404);
  assert.equal(db.sql.length,0);
});
test('no Access, allowlist, mapped relationship or valid identity fails before work query',async()=>{
  for(const [env,ctx] of [
    [environment(),null],
    [{...environment(),FOLIO_ALLOWED_EMAILS:''},context()],
    [{...environment(),FOLIO_RELATIONSHIPS_JSON:'garbled'},context()],
    [environment(),context({email:'outside@example.test',user_uuid:USER})],
  ]) {
    assert.equal((await get(URL,env,ctx)).status,403);
  }
});
test('revoked or absent membership is never reactivated',async()=>{
  for(const active of [0,null]){
    const db=new DB([work()],active);
    assert.equal((await get(URL,environment(db))).status,403);
    assert.equal(db.sql.length,1);
    assert.equal(db.active,active);
  }
});
test('readable manifest preserves maker, edition, role and exact native road',async()=>{
  const r=await get(); const data=await r.json();
  assert.equal(r.status,200);
  assert.equal(data.kind,'constellation');
  assert.equal(data.works.length,1);
  assert.equal(data.works[0].maker,'Independent Maker');
  assert.equal(data.works[0].read_url,work().protected_reader_road);
  assert.equal(data.no_historical_identity_join_implied,true);
  assert.equal(data.state,'private_provisional_not_public');
  assert.equal(r.headers.get('cache-control'),'private, no-store');
  assert.match(r.headers.get('x-robots-tag'),/noindex/);
});
test('held, changed, drifted or unverified members fail the whole result',async()=>{
  for(const diff of [
    {state:'held'}, {audience:'anyone'}, {effective_visibility:'public'},
    {edition_sha256:'b'.repeat(64)}, {sha256:'bad'}, {maker:''},
    {version_label:''}, {protected_reader_road:'https://evil.example/private'},
  ]) {
    const r=await get(URL,environment(new DB([{...work(),...diff}])));
    assert.equal(r.status,503,JSON.stringify(diff));
    assert.equal((await r.json()).code,'constellation_not_verified');
  }
});
test('duplicate identities, ordinal gaps and oversized sets fail',()=>{
  assert.equal(verifiedWorks([work(),work('sample-one',2)]),null);
  assert.equal(verifiedWorks([work('sample-two',2)]),null);
  assert.equal(verifiedWorks(Array.from({length:49},(_,i)=>work('work-'+i,i+1))),null);
});
test('unknown methods and DB failure never expose member rows',async()=>{
  assert.equal((await get(URL,environment(),context(),'POST')).status,405);
  const r=await get(URL,environment(new DB([work()],1,true)));
  assert.equal(r.status,503);
  assert.doesNotMatch(await r.text(),/private DB exception/);
});
test('curator view changes flow to the same address without copying originals',async()=>{
  const db=new DB([work()]);
  const first=await (await get(URL,environment(db))).json();
  db.works=[work(),work('independent-two',2)];
  const second=await (await get(URL,environment(db))).json();
  assert.equal(first.works.length,1);
  assert.equal(second.works.length,2);
  assert.equal(second.works[1].maker,'Independent Maker');
});
test('no writes or identity merges are required to answer the host contract',async()=>{
  const db=new DB();
  await get(URL,environment(db));
  assert.equal(db.sql.length,2);
  assert.ok(db.sql.every(s=>/^\s*SELECT\b/i.test(s)));
});
