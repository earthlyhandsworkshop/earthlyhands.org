import test from 'node:test';
import assert from 'node:assert/strict';
import { auditCoverage, projectForReader, renderHtml, handleReadback } from './readback.mjs';

const event = (id, ordinal, observation, evidence_scope = 'jacket-only') => ({
  event_id: id, event_ordinal: ordinal, maker: 'Fixture Hand',
  observed_at: `2026-10-30T00:00:0${ordinal}Z`, observation,
  evidence_scope, evidence_road: 'invented-source-face',
  authority_limit: 'fictional fixture; no Workshop authority'
});
const mapping = (id, key, local, role = 'states') => ({
  event_id: id, proposition_key: key, proposition_ordinal: local, relation_role: role
});
const fixture = () => ({
  jacket: { title: 'INVENTED JACKET', url: 'https://drive.google.com/file/d/example/view' },
  events: [
    event('date-jacket', 1, 'Date asserted in jacket'),
    event('date-face', 2, 'Date rechecked on represented face', 'original-source-checked'),
    event('students', 3, 'Received is not concurrent attendance', 'original-source-checked'),
    event('funds-report', 4, 'Reported outlays are not property value'),
    event('funds-crossing', 5, 'Certification and payment remain separate', 'independent-multiple-sources')
  ],
  mappings: [
    mapping('date-jacket', 'document-date', 1),
    mapping('date-face', 'document-date', 2, 'deepens'),
    mapping('students', 'student-attendance', 1),
    mapping('funds-report', 'financial-accounting', 1),
    mapping('funds-crossing', 'financial-accounting', 2, 'deepens')
  ]
});
const view = (s, allowed = s.events.map(e => e.event_id), extra = {}) => projectForReader(s, {
  canSeeEvent: e => allowed.includes(e.event_id), canSeeJacket: true, ...extra
});

test('five carrier events resolve into three separately current accessible propositions', () => {
  const v = view(fixture());
  assert.deepEqual(v.propositions.map(p => [p.proposition_key,p.latest_accessible.event_id]), [
    ['document-date','date-face'], ['financial-accounting','funds-crossing'], ['student-attendance','students']
  ]);
  assert.equal(v.propositions[0].readings[1].event_id, 'date-jacket');
  assert.equal(v.propositions[0].readings[1].evidence_scope, 'jacket-only');
  assert.equal(v.propositions[0].readings[0].evidence_scope, 'original-source-checked');
});

test('new financial observation cannot displace current date or attendance claim', () => {
  const s = fixture();
  s.events.push(event('new-financial', 6, 'Different proposition deepening'));
  s.mappings.push(mapping('new-financial','financial-accounting',3,'deepens'));
  const v = view(s);
  assert.equal(v.propositions.find(p=>p.proposition_key==='document-date').latest_accessible.event_id, 'date-face');
  assert.equal(v.propositions.find(p=>p.proposition_key==='financial-accounting').latest_accessible.event_id, 'new-financial');
});

test('same claim earlier reading remains attributable after deepening', () => {
  const date = view(fixture()).propositions.find(p=>p.proposition_key==='document-date');
  assert.deepEqual(date.readings.map(r=>r.event_id),['date-face','date-jacket']);
  assert.deepEqual(date.readings.map(r=>r.relation_role),['deepens','states']);
});

test('unseen proposition never appears as a ghost category or count', () => {
  const s = fixture();
  const v = view(s, ['date-jacket','date-face']);
  const serialized = JSON.stringify(v);
  assert.equal(v.propositions.length,1);
  for (const privateId of ['students','funds-crossing','financial-accounting','student-attendance']) {
    assert.equal(serialized.includes(privateId),false);
  }
  assert.equal(serialized.includes('eventCount'),false);
});

test('absence and hidden existence give the reader indistinguishable responses', () => {
  const s = fixture();
  const only = ['date-jacket','date-face'];
  const stripped = { ...s, events:s.events.filter(e=>only.includes(e.event_id)), mappings:s.mappings.filter(m=>only.includes(m.event_id)) };
  assert.deepEqual(view(s,only),view(stripped,only));
});

test('a restricted reader sees latest ACCESSIBLE, never falsely claims latest overall', () => {
  const s = fixture();
  const v = view(s, ['date-face','funds-report']);
  assert.equal(v.propositions.find(p=>p.proposition_key==='financial-accounting').latest_accessible.event_id,'funds-report');
  assert.match(v.explanation,/permission-bounded/);
  assert.doesNotMatch(JSON.stringify(v),/funds-crossing/);
});

test('61-row history pages 30/30/1 without lost or duplicated accessible events', () => {
  const s = {events:[],mappings:[],jacket:null};
  for(let i=1;i<=61;i++){s.events.push(event('f'+i,i,`Invented observation ${i}`));s.mappings.push(mapping('f'+i,'one-claim',i));}
  const got=[];let before=null;
  do {
    const opts={canSeeEvent:()=>true,pageSize:30};
    if(before!==null)opts.beforeByProposition={'one-claim':before};
    const p=projectForReader(s,opts).propositions[0];
    got.push(...p.readings.map(e=>e.event_ordinal));
    before=p.older_before_cursor;
  }while(before!==null);
  assert.equal(got.length,61);
  assert.deepEqual(got,Array.from({length:61},(_,i)=>61-i));
});

test('31 mapped readings tied on proposition ordinal page 30/1 without loss', () => {
  const s={events:[],mappings:[]};
  for(let i=1;i<=31;i++){
    s.events.push(event('tie'+i,i,'invented'));
    s.mappings.push(mapping('tie'+i,'one',1));
  }
  const seen=[];let before=null;
  do {
    const opts={canSeeEvent:()=>true,pageSize:30};
    if(before!==null)opts.beforeByProposition={one:before};
    const p=projectForReader(s,opts).propositions[0];
    seen.push(...p.readings.map(r=>r.event_id));
    before=p.older_before_cursor;
  }while(before!==null);
  assert.equal(seen.length,31);
  assert.equal(new Set(seen).size,31);
  assert.deepEqual(seen,Array.from({length:31},(_,i)=>'tie'+(31-i)));
});

test('equal proposition and event ordinals use stable event-ID tie-breaker', () => {
  const s={events:[],mappings:[]};
  for(let i=1;i<=31;i++){
    const id='item'+String(i).padStart(2,'0');
    s.events.push(event(id,7,'invented'));
    s.mappings.push(mapping(id,'one',1));
  }
  const first=view(s,undefined,{pageSize:30}).propositions[0];
  assert.equal(first.readings.length,30);
  assert.deepEqual(first.older_before_cursor,{proposition_ordinal:1,event_ordinal:7,event_id:'item02'});
  const second=view(s,undefined,{pageSize:30,beforeByProposition:{one:first.older_before_cursor}}).propositions[0];
  assert.deepEqual(second.readings.map(r=>r.event_id),['item01']);
  assert.equal(second.older_before_cursor,null);
});

test('invalid cursors and duplicate visible sort keys are refused rather than silently skipping',()=>{
  const s={events:[event('a',1,'invented'),event('b',2,'invented')],mappings:[mapping('a','one',1),mapping('b','one',1)]};
  assert.throws(()=>view(s,undefined,{beforeByProposition:{one:1}}),/invalid pagination cursor/);
  assert.throws(()=>view(s,undefined,{beforeByProposition:{one:{proposition_ordinal:1,event_ordinal:2,event_id:''}}}),/invalid pagination cursor/);
  s.mappings.push(mapping('b','one',1));
  assert.throws(()=>view(s),/duplicate visible pagination key/);
});

test('invalid or duplicate visible event IDs are refused before page generation',()=>{
  const s=fixture();
  s.events[0].event_ordinal=0;
  assert.throws(()=>view(s),/invalid visible event key/);
  s.events[0].event_ordinal=1;
  s.events.push({...s.events[0]});
  assert.throws(()=>view(s),/duplicate visible event ID/);
  // Hidden invalid input never creates an observable ghost for a restricted reader.
  const only=['date-face'];
  assert.deepEqual(view(s,only),view(fixture(),only));
});

test('pagination never counts or reveals hidden rows', () => {
  const s={events:[],mappings:[]};
  for(let i=1;i<=40;i++){s.events.push(event('x'+i,i,'invented'));s.mappings.push(mapping('x'+i,'one',i));}
  const v=view(s,['x1','x2','x35','x40'],{pageSize:2});
  assert.deepEqual(v.propositions[0].readings.map(r=>r.event_id),['x40','x35']);
  assert.deepEqual(v.propositions[0].older_before_cursor,{proposition_ordinal:35,event_ordinal:35,event_id:'x35'});
  assert.equal(JSON.stringify(v).includes('x39'),false);
});

test('internal audit detects unmapped and orphan events but restricted readback omits audit',()=>{
  const s=fixture();s.events.push(event('unmapped',6,'orphan observation'));
  s.mappings.push(mapping('missing-event','phantom',1));
  const a=auditCoverage(s);
  assert.deepEqual(a.unmappedEventIds,['unmapped']);
  assert.deepEqual(a.orphanMappingEventIds,['missing-event']);
  assert.equal(JSON.stringify(view(s)).includes('unmapped'),false);
});

test('unverified identity denied BEFORE snapshot retrieval',async()=>{
  let loads=0;
  const r=await handleReadback(new Request('https://staging.invalid/real'),{
    authorize:async()=>({verified:false,canRead:true,allowedEventIds:['date-face']}),
    loadSnapshot:async()=>{loads++;return fixture();}
  });
  assert.equal(r.status,403);assert.equal(loads,0);
  assert.deepEqual(await r.json(),{error:'forbidden'});
});

test('non-GET refused even for verified reader; no database read occurs',async()=>{
  let loads=0;
  const r=await handleReadback(new Request('https://staging.invalid/real',{method:'POST'}),{
    authorize:async()=>({verified:true,canRead:true,allowedEventIds:['date-face']}),
    loadSnapshot:async()=>{loads++;return fixture();}
  });
  assert.equal(r.status,405);assert.equal(loads,0);
});

test('verified reader without explicit event grant is denied before lookup',async()=>{
  let loads=0;
  const r=await handleReadback(new Request('https://staging.invalid/real'),{
    authorize:async()=>({verified:true,canRead:true}),
    loadSnapshot:async()=>{loads++;return fixture();}
  });
  assert.equal(r.status,403);assert.equal(loads,0);
});

test('bounded JSON handler has no private events and no source jacket without separate grant',async()=>{
  const r=await handleReadback(new Request('https://staging.invalid/real'),{
    authorize:async()=>({verified:true,canRead:true,allowedEventIds:['date-face'],canSeeJacket:false}),
    loadSnapshot:async()=>fixture()
  });
  const j=await r.json();assert.equal(r.status,200);
  assert.equal(j.jacket,null);assert.equal(j.propositions.length,1);
  assert.equal(j.propositions[0].readings.length,1);
  assert.equal(JSON.stringify(j).includes('funds-crossing'),false);
  assert.equal(r.headers.get('cache-control'),'private, no-store');
});

test('HTML escapes source text and does not synthesize source authority',()=>{
  const s=fixture();s.events[1].observation='<em>not trusted HTML</em>';s.events[1].authority_limit='No source authority';
  const html=renderHtml(view(s));
  assert.match(html,/&lt;em&gt;not trusted HTML&lt;\/em&gt;/);
  assert.equal(html.includes('<em>not trusted HTML'),false);
  assert.match(html,/Governing source jacket — separate from this display/);
  assert.match(html,/Latest accessible reading/);
  assert.match(html,/Source custody has not moved/);
});

test('source jacket link is an independent permission and unsafe URL is not made clickable',()=>{
  const s=fixture();s.jacket.url='data:text/plain,fixture';
  const html=renderHtml(view(s));
  assert.equal(html.includes('href="data:'),false);
  const noJacket=projectForReader(s,{canSeeEvent:()=>true,canSeeJacket:false});
  assert.equal(noJacket.jacket,null);
});

test('handler second GET reaches 31st tied-ordinal reading',async()=>{
 const s={events:[],mappings:[]};
 for(let i=1;i<=31;i++){s.events.push(event('tie'+i,i,'invented'));s.mappings.push(mapping('tie'+i,'one',1));}
 const authorize=async()=>({verified:true,canRead:true,allowedEventIds:s.events.map(e=>e.event_id)});
 const loadSnapshot=async()=>s;const url='https://staging.invalid/quire/real';
 const first=await handleReadback(new Request(url),{authorize,loadSnapshot});
 assert.equal(first.status,200);
 const p1=(await first.json()).propositions[0];
 assert.equal(p1.readings.length,30);
 const second=await handleReadback(new Request(url,{headers:{'x-quire-before-cursors':JSON.stringify({one:p1.older_before_cursor})}}),{authorize,loadSnapshot});
 assert.equal(second.status,200);
 const p2=(await second.json()).propositions[0];
 assert.deepEqual(p2.readings.map(r=>r.event_id),['tie1']);
 assert.equal(p2.older_before_cursor,null);
 assert.equal(new Set([...p1.readings,...p2.readings].map(r=>r.event_id)).size,31);
});
test('malformed header refuses before read but Access refusal remains first',async()=>{
 let loads=0;const loadSnapshot=async()=>{loads++;return fixture()};
 const req=new Request('https://staging.invalid/quire/real',{headers:{'x-quire-before-cursors':'{bad'}});
 const bad=await handleReadback(req,{authorize:async()=>({verified:true,canRead:true,allowedEventIds:['date-face']}),loadSnapshot});
 assert.equal(bad.status,400);assert.equal(loads,0);
 const denied=await handleReadback(req,{authorize:async()=>({verified:false,canRead:true,allowedEventIds:[]}),loadSnapshot});
 assert.equal(denied.status,403);assert.equal(loads,0);
});
test('a cursor cannot preserve an older grant',async()=>{
 const s=fixture();const header=JSON.stringify({'document-date':{proposition_ordinal:2,event_ordinal:2,event_id:'date-face'}});
 const response=await handleReadback(new Request('https://staging.invalid/quire/real',{headers:{'x-quire-before-cursors':header}}),{
 authorize:async()=>({verified:true,canRead:true,allowedEventIds:['students']}),loadSnapshot:async()=>s});
 assert.equal(response.status,200);
 const v=await response.json();
 assert.deepEqual(v.propositions.map(p=>p.proposition_key),['student-attendance']);
 assert.equal(JSON.stringify(v).includes('date-face'),false);
});
