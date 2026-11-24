import test from 'node:test';
import assert from 'node:assert/strict';
import { servePrivateConstellation, validateMembers, boundedReadOnlySql } from './constellation-host.mjs';
import { registryWith, curatedViewMembersSql } from './registry.mjs';

const BASE = 'https://earthly-hands-listening-ground.workshop-1a6.workers.dev';
const slug = 'example-seven';
const page = BASE + '/folio/workshop/constellations/' + slug + '/';
const email = 'member@example.test';
const uuid = 'identity-123';
const role = 'private:member';
const REGISTRY = registryWith({ slug, title: 'An Open Identity Question', question: 'What would distinguish two appearances?', description: 'Seven independently made readings.', curator: 'First Curator · independent selection', source_view: 'sample_curated_view_v1', audience: 'existing_folio_members', members_sql: 'SELECT safe_fields FROM sample_curated_view_v1 LIMIT 49' });
const good = (id = 'work-abc') => ({
  ordinal: 1, curatorial_role: 'source question', slug: id,
  title: 'A question about the records', maker: 'First Maker and collaborators',
  version_label: 'private v1',
  protected_reader_road: BASE + '/folio/workshop/native/' + id,
  sha256: 'a'.repeat(64), state: 'private_approved', audience: 'existing_folio_members',
  effective_visibility: null, edition_sha256: null,
});
const membershipHash = async (value) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');
class MockDB {
  constructor({ works = [good()], active = 1, error = false } = {}) {
    this.works = works; this.active = active; this.error = error; this.queries = [];
  }
  prepare(sql) {
    this.queries.push(sql);
    const db = this;
    return {
      bind(...params) { this.args = params; return this; },
      async first() {
        if (db.error) throw Error('db error');
        if (!sql.includes('folio_memberships')) throw Error('unexpected private lookup');
        const [rel,hash] = this.args || [];
        return rel === role && hash === await membershipHash(uuid) && db.active != null ? {active:db.active} : null;
      },
      async all() {
        if (db.error) throw Error('db error');
        if (!sql.includes('sample_curated_view_v1')) throw Error('query must use maker view');
        return {results:db.works};
      },
    };
  }
}
const env = (db = new MockDB()) => ({RECEIVING_DB:db,FOLIO_ALLOWED_EMAILS:email,FOLIO_RELATIONSHIPS_JSON:JSON.stringify({[email]:{id:role,name:'Holder'}})});
const ctx = (identity={email,user_uuid:uuid}) => ({access:{getIdentity:async()=>identity}});
const run = (url=page, options={}) => servePrivateConstellation(new Request(url,{method:options.method||'GET'}), options.env||env(), options.ctx===undefined?ctx():options.ctx, { registry: REGISTRY });
const body = async response => response.headers.get('content-type')?.includes('application/json') ? response.json() : response.text();

test('unrelated route does not take over existing worker', async () => {
  assert.equal(await run(BASE+'/folio/'), null);
  assert.equal(await run('https://example.test/folio/workshop/constellations/example-seven/'), null);
});
test('unknown host never triggers a D1 query', async () => {
  const db = new MockDB(); const r = await run(BASE+'/folio/workshop/constellations/missing/manifest.json',{env:env(db)});
  assert.equal(r.status,404);assert.equal(db.queries.length,0);
});
test('no Access identity fails closed before reading work', async () => {
  const db = new MockDB();const r = await run(page,{ctx:null,env:env(db)});
  assert.equal(r.status,403);assert.equal(db.queries.length,0);
});
test('missing allowlist and missing mapped relationship refuse', async () => {
  for(const change of [{FOLIO_ALLOWED_EMAILS:''},{FOLIO_RELATIONSHIPS_JSON:'bad-json'},{FOLIO_RELATIONSHIPS_JSON:'{}'}]){
    const r = await run(page,{env:{...env(),...change}});assert.equal(r.status,403);
  }
});
test('unapproved, mismatched and inaccessible identity refuse',async()=>{
  const r1=await run(page,{ctx:ctx({email:'other@example.test',user_uuid:uuid})});assert.equal(r1.status,403);
  const r2=await run(page,{ctx:ctx({email,user_uuid:'wrong'})});assert.equal(r2.status,403);
  const r3=await run(page,{ctx:{access:{async getIdentity(){throw Error('Access error')}}}});assert.equal(r3.status,403);
});
test('revoked membership is never reactivated', async () => {
  const db = new MockDB({active:0});const r = await run(page,{env:env(db)});
  assert.equal(r.status,403);assert.equal(db.active,0);assert.equal(db.queries.length,1);
});
test('missing membership denies rather than creating a new one',async()=>{
  const db=new MockDB({active:null});const r=await run(page,{env:env(db)});
  assert.equal(r.status,403);assert.equal(db.queries.length,1);
});
test('private manifest preserves author, edition and bounded original link',async()=>{
  const r=await run(page+'manifest.json'); const j=await r.json();
  assert.equal(r.status,200);assert.equal(j.kind,'constellation');assert.equal(j.slug,'example-seven');
  assert.equal(j.curator,'First Curator · independent selection');
  assert.equal(j.works[0].maker,good().maker);assert.equal(j.works[0].read_url,good().protected_reader_road);
  assert.equal(j.works[0].edition_sha256,good().sha256);
  assert.equal(j.state,'private_provisional_not_public');assert.equal(j.no_identity_join_implied,true);
  assert.equal(r.headers.get('cache-control'),'private, no-store');
  assert.match(r.headers.get('content-security-policy'),/default-src 'none'/);
});
test('private HTML is a usable reader with maker credit and no external script',async()=>{
  const r=await run();const s=await r.text();
  assert.equal(r.status,200);assert.match(s,/An Open Identity Question/);assert.match(s,/First Curator/);
  assert.match(s,/Maker: First Maker and collaborators/);assert.match(s,/<ol class="works">/);
  assert.match(s,/Compose a message about this question/i);assert.doesNotMatch(s,/<script/);
  assert.match(r.headers.get('x-robots-tag'),/noindex/);
});
test('HTML encodes untrusted titles and maker strings',async()=>{
  const work={...good(),title:'<script>alert("x")</script>',maker:'A & B <img>'};
  const r=await run(page,{env:env(new MockDB({works:[work]}))});const s=await r.text();
  assert.doesNotMatch(s,/<script>/);assert.doesNotMatch(s,/<img>/);
  assert.match(s,/&lt;script&gt;/);assert.match(s,/A &amp; B &lt;img&gt;/);
});
test('identity changes, withdrawn editions and public drift refuse the whole constellation',async()=>{
  for(const changes of [
    {state:'held'}, {audience:'anyone'}, {effective_visibility:'public'},
    {edition_sha256:'b'.repeat(64)}, {sha256:'not-a-hash'},
    {maker:''},{curatorial_role:''}, {version_label:''},
  ]){
    const r=await run(page,{env:env(new MockDB({works:[{...good(),...changes}]}))});
    assert.equal(r.status,503,JSON.stringify(changes));
    assert.equal((await r.json()).code,'constellation_not_verified');
  }
});
test('outbound links must point to exact existing protected native slug',async()=>{
  for(const url of [
    'https://evil.example/folio/workshop/native/work-abc',
    BASE+'/folio/workshop/native/another-person',
    BASE+'/folio/workshop/native/work-abc?reveal=true',
    BASE+'/folio/workshop/native/work-abc#privates',
    'javascript:alert(1)',
  ]) {
    assert.equal(validateMembers([{...good(), protected_reader_road:url}]),null,url);
  }
});
test('duplicate member, ordinal gaps and too many works fail instead of truncating',async()=>{
  assert.equal(validateMembers([good(),{...good(),ordinal:2}]),null);
  assert.equal(validateMembers([{...good(),ordinal:2}]),null);
  assert.equal(validateMembers(Array.from({length:49},(_,i)=>({...good('member-'+i),ordinal:i+1}))),null);
});
test('no public or unregistered route is silently exposed',async()=>{
  const r=await run('https://earthlyhands.org/constellations/example-seven/');assert.equal(r,null);
  const r2=await run(page+'../../anything');assert.equal(r2,null);
  const r3=await run(page+'?format=public');assert.equal(r3.status,404);
});
test('POST refused; private source query failure does not leak details',async()=>{
  const p=await run(page,{method:'POST'});assert.equal(p.status,405);
  const db=new MockDB({error:true}),r=await run(page,{env:env(db)});
  assert.equal(r.status,503);assert.doesNotMatch(JSON.stringify(await body(r)),/db error/i);
});
test('trusted registry can add distinct maker without changing host code',async()=>{
  const registry=registryWith({slug:'different-maker',title:'Other inquiry',question:'A source question',description:'Different form',curator:'Other Maker',source_view:'approved_static_view',audience:'existing_folio_members',members_sql:'SELECT approved fields FROM private_maker_view LIMIT 49'});
  assert.ok(registry['different-maker']);
  assert.throws(()=>registryWith({slug:'different-maker',audience:'existing_folio_members',title:'Duplicate',curator:'Other',source_view:'x',members_sql:'SELECT 1'}, {slug:'different-maker',audience:'existing_folio_members',title:'Duplicate again',curator:'Other',source_view:'x',members_sql:'SELECT 2'}));
});


test('bounded source adapter is SELECT only and refuses query stacking', async()=>{
  const accepted='SELECT ordinal,title,maker FROM private_approved_view LIMIT 49';
  assert.equal(boundedReadOnlySql(accepted),true);
  for(const sql of [
    'UPDATE folio_memberships SET active=1',
    'DELETE FROM folio_leaves',
    'SELECT * FROM private_approved_view; DELETE FROM folio_memberships',
    'SELECT * FROM private_approved_view -- ignore the rest',
    'WITH x AS (UPDATE hidden SET active=1) SELECT * FROM x',
    'SELECT * FROM private_approved_view /* leaked */',
    'SELECT * FROM private_approved_view ' + ' '.repeat(2500),
    '',null,
  ]) assert.equal(boundedReadOnlySql(sql),false,String(sql).slice(0,50));
  const unsafe=registryWith({slug:'unsafe-statement', title:'Unsafe', question:'?', curator:'Someone', description:'Test',source_view:'unsafe_view',audience:'existing_folio_members',members_sql:'UPDATE folio_memberships SET active=1'});
  const db=new MockDB();
  const r=await servePrivateConstellation(new Request(BASE+'/folio/workshop/constellations/unsafe-statement/'),env(db),ctx(),{registry:unsafe});
  assert.equal(r.status,503);
  assert.equal(db.queries.length,1,'only membership lookup performed; no write attempt');
});

test('member metadata has safe output bounds; no unbounded visitor response',()=>{
  assert.equal(validateMembers([{...good(),title:'x'.repeat(221)}]),null);
  assert.equal(validateMembers([{...good(),maker:'x'.repeat(361)}]),null);
  assert.equal(validateMembers([{...good(),version_label:'x'.repeat(181)}]),null);
  assert.equal(validateMembers([{...good(),curatorial_role:'x'.repeat(111)}]),null);
  assert.equal(validateMembers([{...good(),title:'one\u0000two'}]),null);
  assert.ok(validateMembers([good()]));
});

test('reader is keyboard-skippable into independently made works',async()=>{
  const r=await run();const s=await r.text();
  assert.match(s,/href="#member-works"/);
  assert.match(s,/id="member-works" tabindex="-1"/);
  assert.match(s,/\.skip:focus\{/);
});


test('curator source adapter composes one bounded D1 read without copying works', () => {
  const sql = curatedViewMembersSql('reviewed_private_curation_v1');
  assert.equal(boundedReadOnlySql(sql), true);
  assert.match(sql, /FROM "reviewed_private_curation_v1" AS c/);
  assert.match(sql, /JOIN eh_native_experiences_v1 AS n ON n.slug=c.slug/);
  assert.match(sql, /LEFT JOIN eh_work_visibility_controls_v1 AS v/);
  assert.match(sql, /v\.edition_sha256/);
  assert.match(sql, /LIMIT 49$/);
  assert.doesNotMatch(sql, /INSERT|UPDATE|DELETE|DROP|;|--/i);
});

test('curator view identifier cannot become visitor SQL or another database object', () => {
  for (const bad of ['', null, 4, 'SELECT * FROM archive', 'private;DROP TABLE work',
    'main.sqlite_master', 'sqlite_schema', 'pragma_table_info',
    'curator-view', 'curator.view', 'curator\nview', 'x'.repeat(140)]) {
    assert.throws(() => curatedViewMembersSql(bad), undefined, JSON.stringify(bad));
  }
});

test('two separately selected works retain independent edition hashes in a manifest', async () => {
  const a=good('first-work');
  const b={...good('second-work'),ordinal:2,sha256:'b'.repeat(64),maker:'Second independent maker'};
  const db=new MockDB({works:[a,b]});
  const r=await run(page+'manifest.json',{env:env(db)});
  const j=await r.json();
  assert.equal(r.status,200);
  assert.deepEqual(j.works.map(w=>w.edition_sha256),['a'.repeat(64),'b'.repeat(64)]);
  assert.equal(j.works[1].maker,'Second independent maker');
  assert.equal(j.works[0].read_url,BASE+'/folio/workshop/native/first-work');
});
