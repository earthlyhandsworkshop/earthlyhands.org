import test from 'node:test';
import assert from 'node:assert/strict';
import {LENS_SCHEMA, auditLensFixture, walkLens} from './lens-walk.mjs';

// ALL invented: similar names, neighboring cadastral addresses, a comparison
// bridge, and a private note. None describes the Bell–McKinney historical record.
const source = (fileId, locator, exactPhrase, eventTime, recordTime, access='public') =>
  ({fileId, locator, exactPhrase, eventTime, recordTime, access});
const node = (id, label, s, access='public', nonclaims=[]) =>
  ({id, kind:'occurrence', label, access, identityState:'unresolved', source:s, nonclaims});
const anchor = (id, label, access='public') =>
  ({id,kind:'anchor',label,access,identityState:null,source:null,nonclaims:[]});
const relation = (id, from, to, facet, verb, fileId, locator, access='public') => ({
  id,from,to,facet,verb,standing: facet === 'comparison'?'comparison-only':'source-stated',
  witness:{fileId,locator,role:facet === 'comparison'?'workshop-comparison':'source-face',access}, access
});
function sample() {
  return {schema:LENS_SCHEMA, nodes:[
    node('occ-cash', 'Neri Vale',source('fictional-cash','p.4','Neri Vale, section 5','1843','1843'),
      'public',['Not evidence of kinship or same-person identity']),
    node('occ-patent','Neri Vale',source('fictional-patent','p.8','Neri Vale, section 4','1846','1851'),
      'public',['Patent date and later record date remain distinct']),
    anchor('sec-5','Section 5'),anchor('sec-4','Section 4'),
    node('private-note','Private field notebook',source('fictional-private','leaf 2','unshared words',null,'1852','private'),'private'),
  ], relations:[
    relation('cash-place','occ-cash','sec-5','spatial','LOCATED_IN','fictional-cash','p.4'),
    relation('patent-place','occ-patent','sec-4','spatial','LOCATED_IN','fictional-patent','p.8'),
    relation('neighbor-only','sec-5','sec-4','comparison','NEIGHBORING_ADDRESS','fictional-reading','comparison ¶2'),
    relation('private-link','private-note','sec-5','documentary','MENTIONED_NEAR','fictional-private','leaf 2','private'),
  ]};
}
const ids = x => x.nodes.map(n => n.id).sort();
const rid = x => x.relations.map(r => r.id).sort();
const edit = fn => {const f=sample();fn(f);return f;};

test('same source set supports depth 0/1/2/3 without rebuilding a fixed picture',()=>{
  const f=sample();
  assert.deepEqual(ids(walkLens(f,{center:'occ-cash',depth:0})),['occ-cash']);
  assert.deepEqual(ids(walkLens(f,{center:'occ-cash',depth:1})),['occ-cash','sec-5']);
  assert.deepEqual(ids(walkLens(f,{center:'occ-cash',depth:2})),['occ-cash','sec-4','sec-5']);
  assert.deepEqual(ids(walkLens(f,{center:'occ-cash',depth:3})),['occ-cash','occ-patent','sec-4','sec-5']);
});

test('change focus, retain exact source roads and distinct record/event times',()=>{
  const view=walkLens(sample(),{center:'occ-patent',depth:1});
  assert.deepEqual(ids(view),['occ-patent','sec-4']);
  const n=view.nodes.find(n=>n.id==='occ-patent');
  assert.equal(n.source.fileId,'fictional-patent');
  assert.equal(n.source.locator,'p.8');
  assert.equal(n.source.exactPhrase,'Neri Vale, section 4');
  assert.equal(n.source.eventTime,'1846');
  assert.equal(n.source.recordTime,'1851');
  assert.deepEqual(n.nonclaims,['Patent date and later record date remain distinct']);
});

test('similar-name occurrences never coalesce into a person or implicit identity edge',()=>{
  const view=walkLens(sample(),{center:'occ-cash',depth:3});
  assert.equal(view.nodes.filter(n=>n.label==='Neri Vale').length,2);
  assert.deepEqual(rid(view),['cash-place','neighbor-only','patent-place']);
  assert.equal(view.relations.find(r=>r.id==='neighbor-only').standing,'comparison-only');
  assert.equal(view.relations.find(r=>r.id==='neighbor-only').witness.role,'workshop-comparison');
  assert.ok(!view.relations.some(r=>r.verb.includes('SAME_PERSON')));
});

test('turn off comparison and the cross-occurrence bridge disappears',()=>{
  const view=walkLens(sample(),{center:'occ-cash',depth:3,facets:['spatial']});
  assert.deepEqual(ids(view),['occ-cash','sec-5']);
  assert.deepEqual(rid(view),['cash-place']);
});

test('a private intermediate and its edges do not leak through IDs, counts, or paths',()=>{
  const f=sample();
  const before=walkLens(f,{center:'sec-5',depth:3});
  const withoutPrivate=edit(f=>{
    f.nodes=f.nodes.filter(n=>n.id!=='private-note');
    f.relations=f.relations.filter(r=>r.id!=='private-link');
  });
  assert.deepEqual(before,walkLens(withoutPrivate,{center:'sec-5',depth:3}));
  assert.ok(!JSON.stringify(before).includes('private'));
  assert.deepEqual(ids(walkLens(f,{center:'private-note',depth:1,viewer:'private'})),
    ['private-note','sec-5']);
  assert.throws(()=>walkLens(f,{center:'private-note',depth:1}),/Focus not available/);
  assert.throws(()=>walkLens(f,{center:'does-not-exist',depth:1}),/Focus not available/);
});

test('a public edge cannot carry a private source witness, even between public endpoints',()=>{
  const f=edit(f=>f.relations[2].witness.access='private');
  assert.throws(()=>auditLensFixture(f),/broader than endpoint or witness/);
});

test('unknown rights and undeclared fields refuse rather than silently upgrade a view',()=>{
  assert.throws(()=>auditLensFixture(edit(f=>f.nodes[0].source.access='unverified')),/Unknown access/);
  assert.throws(()=>auditLensFixture(edit(f=>f.relations[0].privateNote='secret')),/Unsupported lens relation fields/);
  assert.throws(()=>auditLensFixture(edit(f=>f.nodes[0].source.extra='not permitted')),/Unsupported occurrence source fields/);
});

test('a comparison cannot be relabeled as direct source testimony',()=>{
  assert.throws(()=>auditLensFixture(edit(f=>f.relations[2].standing='source-stated')),/Comparison cannot be promoted/);
  assert.throws(()=>auditLensFixture(edit(f=>f.relations[2].witness.role='source-face')),/Comparison cannot be promoted/);
  assert.throws(()=>auditLensFixture(edit(f=>f.relations[0].standing='maybe')),/Comparison cannot be promoted/);
});

test('strict IDs and endpoint references protect the exact returned record',()=>{
  assert.throws(()=>auditLensFixture(edit(f=>f.nodes[1].id='occ-cash')),/Invalid or duplicate/);
  assert.throws(()=>auditLensFixture(edit(f=>f.relations[0].to='missing')),/dangling/);
  assert.throws(()=>auditLensFixture(edit(f=>f.nodes[0].source.access='private')),/Node is broader than its source/);
});

test('bad depth, facets and viewer claims refuse; full fixture remains unchanged',()=>{
  const f=sample(), original=structuredClone(f);
  assert.throws(()=>walkLens(f,{center:'occ-cash',depth:4}),/depth/);
  assert.throws(()=>walkLens(f,{center:'occ-cash',facets:['spatial','spatial']}),/facets/);
  assert.throws(()=>walkLens(f,{center:'occ-cash',viewer:'god'}),/Unknown access/);
  walkLens(f,{center:'sec-5',depth:3});
  assert.deepEqual(f,original);
});
