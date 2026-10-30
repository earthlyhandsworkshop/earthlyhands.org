import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openResearchRoads, nameRoad, sourceRoad, identityRoad } from './research-roads-v0.mjs';

const workshop = {authenticated:true,workshopMember:true,principalId:'reader'};
const owner = {authenticated:true,workshopMember:true,principalId:'author'};
const stranger = {authenticated:true,workshopMember:true,principalId:'stranger'};
const noAccess = {authenticated:false,workshopMember:false,principalId:'author'};

function populate(db) {
  const s = db.prepare('INSERT INTO sources VALUES (?,?,?,?,?)');
  s.run('doc-a','fictional/jacket-a.md','rev-1','workshop',null);
  s.run('doc-b','fictional/jacket-b.md','rev-3','workshop',null);
  s.run('doc-c','fictional/jacket-a.md','rev-2','workshop',null); // Same path != same revision.
  s.run('private-doc','fictional/private.md','rev-1','private','author');
  const p = db.prepare('INSERT INTO people VALUES (?,?,?,?)');
  p.run('person-A','Morgan Vale','workshop',null);
  p.run('person-B','Morgan Vale','workshop',null);
  p.run('person-private','Morgan Vale','private','author');
  const w = db.prepare('INSERT INTO work VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
  w.run('a-claim','doc-a','person-A','Morgan Vale','02','claim','Draft reading','hand-a',null,null,'workshop',null);
  w.run('b-correction','doc-b','person-A','Morgan Vale','15','claim','Corrected reading','hand-b','a-claim','doc-b','workshop',null);
  w.run('c-separate','doc-a','person-B','Morgan Vale','15','reading','A separate person','hand-c',null,null,'workshop',null);
  w.run('d-unassigned','doc-c',null,'Morgan Vale','02','question','Unassigned occurrence','hand-d',null,null,'workshop',null);
  w.run('e-private','private-doc','person-private','Morgan Vale','15','claim','Private interpretation','hand-e',null,null,'private','author');
  const g = db.prepare('INSERT INTO gaps VALUES (?,?,?,?,?,?,?,?)');
  g.run('gap-blank','doc-a',null,'blank_source_field','column 4 empty','reader','workshop',null);
  g.run('gap-search','doc-a',null,'search_no_match','search: variant name in folder X','reader','workshop',null);
  g.run('gap-uninspected','doc-a',null,'uninspected_source','folio 9 not inspected','reader','workshop',null);
  g.run('gap-identity','doc-a','person-A','unresolved_identity','relation to person-B','reader','workshop',null);
  g.run('gap-private','private-doc','person-private','unresolved_identity','private question','author','private','author');
  const i = db.prepare('INSERT INTO identity_links VALUES (?,?,?,?,?,?,?,?,?)');
  i.run('relation-open','person-A','person-B','open',null,'hand-a','May be related; not joined','workshop',null);
}

function withDb(fn) {
  const db = openResearchRoads();
  try { populate(db); return fn(db); } finally { db.close(); }
}

test('same written name returns distinct IDs plus genuinely unassigned occurrence', () => withDb(db => {
  const hits = nameRoad(db,'morgan vale',workshop);
  assert.deepEqual(hits.map(x => x.person_id), ['person-A','person-A','person-B',null]);
  assert.deepEqual(new Set(hits.filter(x=>x.person_id).map(x=>x.person_id)),new Set(['person-A','person-B']));
  assert.equal(hits[3].source_id,'doc-c');
}));

test('source finger retrieves 02 and 15 work, including a later correction grounded in another source', () => withDb(db => {
  const trail = sourceRoad(db,'doc-a',workshop);
  assert.equal(trail.source.revision_ref,'rev-1');
  assert.deepEqual(trail.work.map(x=>x.work_id),['a-claim','b-correction','c-separate']);
  assert.equal(trail.work[1].corrects_work_id,'a-claim');
  assert.equal(trail.work[1].basis_source_id,'doc-b');
  assert.equal(trail.work[0].words,'Draft reading'); // Correction has not erased it.
  assert.equal(sourceRoad(db,'doc-c',workshop).work.length,1); // Same carrier ref, different version.
}));

test('four negative-space states stay different; none implies a universal absence', () => withDb(db => {
  const notes = sourceRoad(db,'doc-a',workshop).gaps;
  assert.deepEqual(notes.map(x=>x.kind),[
    'blank_source_field','unresolved_identity','search_no_match','uninspected_source']);
  assert.throws(()=>db.prepare('INSERT INTO gaps VALUES (?,?,?,?,?,?,?,?)')
    .run('bad','doc-a',null,'person_absent','everywhere','reader','workshop',null),/CHECK constraint/);
  assert.match(notes.find(x=>x.kind==='search_no_match').locator_or_query,/folder X/);
}));

test('an open identity edge is visible as a proposition but never collapses IDs', () => withDb(db => {
  assert.deepEqual(identityRoad(db,'person-A',workshop).map(x=>x.status),['open']);
  assert.equal(nameRoad(db,'Morgan Vale',workshop).filter(x=>x.person_id==='person-B').length,1);
  db.prepare('INSERT INTO identity_links VALUES (?,?,?,?,?,?,?,?,?)').run(
    'relation-supported','person-A','person-B','source_supported','doc-b',
    'hand-b','Claimed source support, not automatic identity','workshop',null);
  assert.deepEqual(identityRoad(db,'person-B',workshop).map(x=>x.status),['open','source_supported']);
  assert.equal(new Set(nameRoad(db,'Morgan Vale',workshop).map(x=>x.person_id)).size,3);
  assert.throws(()=>db.prepare('INSERT INTO identity_links VALUES (?,?,?,?,?,?,?,?,?)').run(
    'unsupported','person-A','person-B','source_supported',null,'x','no basis','workshop',null),/CHECK constraint/);
}));

test('unauthenticated reader sees no fixture data; private rows do not leak to another hand', () => withDb(db => {
  assert.deepEqual(nameRoad(db,'Morgan Vale',noAccess),[]);
  assert.equal(sourceRoad(db,'doc-a',noAccess),null);
  assert.deepEqual(identityRoad(db,'person-A',noAccess),[]);
  assert.equal(sourceRoad(db,'private-doc',stranger),null);
  assert.equal(nameRoad(db,'Morgan Vale',stranger).length,4);
  assert.equal(nameRoad(db,'Morgan Vale',owner).length,5);
  assert.equal(sourceRoad(db,'private-doc',owner).work[0].words,'Private interpretation');
}));

test('visibility is applied in SQL before LIMIT (not after a broad search)', () => withDb(db => {
  for(let k=0;k<12;k++) db.prepare('INSERT INTO work VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(
    `0${k.toString().padStart(2,'0')}`,'private-doc','person-private','Morgan Vale','15',
    'claim','Not visible','author',null,null,'private','author');
  const first = nameRoad(db,'Morgan Vale',stranger,1);
  assert.equal(first.length,1);
  assert.equal(first[0].work_id,'a-claim');
}));

test('a correction must have a basis, same person, and same visibility compartment', () => withDb(db => {
  const w = db.prepare('INSERT INTO work VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
  assert.throws(()=>w.run('bad-basis','doc-b','person-A','Morgan Vale','15','claim','X','x',
    'a-claim',null,'workshop',null),/CHECK constraint/);
  assert.throws(()=>w.run('bad-person','doc-b','person-B','Morgan Vale','15','claim','X','x',
    'a-claim','doc-b','workshop',null),/Correction changes subject/);
  assert.throws(()=>w.run('bad-scope','private-doc','person-private','Morgan Vale','15','claim','X','x',
    'a-claim','private-doc','private','author'),/Correction crosses scope/);
  assert.equal(sourceRoad(db,'doc-a',workshop).work.length,3);
}));

test('source/person scope inconsistencies refuse rather than exposing hidden pointers', () => withDb(db => {
  const w = db.prepare('INSERT INTO work VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
  assert.throws(()=>w.run('bad-mixed','doc-a','person-private','Morgan Vale','15','reading','X','x',
    null,null,'workshop',null),/Person scope differs/);
  assert.throws(()=>db.prepare('INSERT INTO identity_links VALUES (?,?,?,?,?,?,?,?,?)').run(
    'bad-link','person-A','person-private','open',null,'x','mixed','workshop',null),/Identity right scope differs/);
}));

test('recorded claims and gaps cannot be rewritten or erased through the fixture', () => withDb(db => {
  assert.throws(()=>db.exec("UPDATE work SET words='erased' WHERE work_id='a-claim'"),/Append-only fixture/);
  assert.throws(()=>db.exec("DELETE FROM gaps WHERE gap_id='gap-search'"),/Append-only fixture/);
  assert.throws(()=>db.exec("UPDATE sources SET revision_ref='rev-2' WHERE source_id='doc-a'"),/Append-only fixture/);
}));

test('cold reopen preserves distinct IDs, correction, scope, and states', () => {
  const dir=mkdtempSync(join(tmpdir(),'research-roads-'));
  const path=join(dir,'index.sqlite');
  try {
    let db=openResearchRoads(path); populate(db); db.close();
    db=openResearchRoads(path);
    try {
      assert.equal(nameRoad(db,'Morgan Vale',workshop).length,4);
      assert.equal(sourceRoad(db,'doc-a',workshop).gaps.length,4);
      assert.equal(sourceRoad(db,'doc-a',workshop).work[1].corrects_work_id,'a-claim');
      assert.equal(sourceRoad(db,'private-doc',stranger),null);
    } finally {db.close();}
  } finally {rmSync(dir,{recursive:true,force:true});}
});
