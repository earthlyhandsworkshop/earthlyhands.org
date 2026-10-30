// Fictional evidence grammar only; actors are labels, not authenticated humans.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSourceAssertionsV2, appendSourceAssertionV2,
  auditSourceAssertionsV2, checkIndependentSourceTip,
  SOURCE_ASSERTIONS_V2_SCHEMA } from './bench-source-assertions-v2.mjs';

const workshop={kind:'workshop'};
const player={kind:'bello-player',ownerId:'player-a',matchId:'match-1'};
const arrival=(overrides={})=>({kind:'arrive',eventId:'e1',actor:'alice',
  itemId:'leaf-7',assertionId:'a1',priorAssertionId:null,basisPointer:null,
  sourceId:'source-7',warningIds:['unresolved-warning-7'],
  access:workshop,...overrides});
const correction=(overrides={})=>({kind:'correct',eventId:'e2',actor:'bob',
  itemId:'leaf-7',assertionId:'a2',priorAssertionId:'a1',
  basisPointer:'basis-note-2',sourceId:'source-7-corrected',
  warningIds:['unresolved-warning-7','source-doubt-2'],
  access:workshop,...overrides});
function initial() {
  const start=createSourceAssertionsV2('old-growth',workshop);
  return appendSourceAssertionV2(start,arrival(),0);
}
function corrected() { return appendSourceAssertionV2(initial(),correction(),1); }

test('v2 arrival and attributed correction keep original assertion, warnings, predecessor, and basis',()=>{
  const first=initial(), next=appendSourceAssertionV2(first,correction(),1);
  assert.equal(next.schema,SOURCE_ASSERTIONS_V2_SCHEMA);
  assert.equal(next.generation,2);
  assert.equal(first.receipts[0].sourceId,'source-7');
  assert.equal(first.receipts[0].claimDigest,next.receipts[0].claimDigest);
  assert.deepEqual(next.receipts[0].warningIds,['unresolved-warning-7']);
  assert.deepEqual(next.current[0].warningIds,['unresolved-warning-7','source-doubt-2']);
  assert.equal(next.current[0].sourceId,'source-7-corrected');
  assert.equal(next.receipts[1].priorAssertionId,'a1');
  assert.equal(next.receipts[1].priorDigest,next.receipts[0].claimDigest);
  assert.equal(next.receipts[1].basisPointer,'basis-note-2');
  assert.equal(next.receipts[1].actor,'bob');
  assert.equal(checkIndependentSourceTip(next,1,first.tipDigest),true);
  assert.equal(auditSourceAssertionsV2(next).tipDigest,next.tipDigest);
});

test('a changed current source pointer or silently erased warning is refused on replay',()=>{
  for(const change of [x=>{x.current[0].sourceId='quiet-replacement';},
    x=>{x.current[0].warningIds=[];}]) {
    const altered=structuredClone(initial());
    change(altered);
    assert.throws(()=>auditSourceAssertionsV2(altered),/digest mismatch|materialization mismatch/);
  }
});

test('a changed old arrival receipt is refused even when later current values remain intact',()=>{
  for(const change of [x=>{x.receipts[0].sourceId='new-source';},
    x=>{x.receipts[0].warningIds=[];}]) {
    const altered=structuredClone(corrected());
    change(altered);
    assert.throws(()=>auditSourceAssertionsV2(altered),/digest mismatch/);
  }
});

test('correction cannot quietly change predecessor, omit basis, or switch access compartment',()=>{
  const first=initial();
  assert.throws(()=>appendSourceAssertionV2(first,correction({priorAssertionId:'a99'}),1),
    /predecessor or basis mismatch/);
  assert.throws(()=>appendSourceAssertionV2(first,correction({basisPointer:null}),1),
    /predecessor or basis mismatch/);
  assert.throws(()=>appendSourceAssertionV2(first,correction({access:player}),1),
    /Item access does not match bench/);
  const edited=structuredClone(corrected());
  edited.receipts[1].priorDigest='0'.repeat(64);
  assert.throws(()=>auditSourceAssertionsV2(edited),/predecessor or basis mismatch/);
});

test('stale generation, duplicate arrival, duplicate event ID and unsupported versions refuse',()=>{
  const first=initial();
  assert.throws(()=>appendSourceAssertionV2(first,correction(),0),/Stale source assertion generation/);
  assert.throws(()=>appendSourceAssertionV2(first,arrival({eventId:'e3',assertionId:'a3'}),1),
    /Invalid source assertion arrival/);
  assert.throws(()=>appendSourceAssertionV2(first,correction({eventId:'e1'}),1),
    /identity or sequence mismatch/);
  const old=structuredClone(first);
  old.schema='earthlyhands.workbench.source-sqlite-snapshot.v1';
  assert.throws(()=>auditSourceAssertionsV2(old),/Unsupported source-assertion schema/);
});

test('an unrelated private compartment cannot be switched by changing a receipt',()=>{
  const begin=createSourceAssertionsV2('player-bench',player);
  const one=appendSourceAssertionV2(begin,arrival({access:player}),0);
  const changed=structuredClone(one);
  changed.receipts[0].access=workshop;
  assert.throws(()=>auditSourceAssertionsV2(changed),/Item access does not match bench/);
  assert.equal(auditSourceAssertionsV2(one).current[0].access.ownerId,'player-a');
});

test('JSON return reconstructs complete receipts and refuses an altered materialization',()=>{
  const copied=JSON.parse(JSON.stringify(corrected()));
  const result=auditSourceAssertionsV2(JSON.stringify(copied));
  assert.equal(result.generation,2);
  assert.equal(result.current[0].assertionId,'a2');
  copied.current[0].assertionId='a1';
  assert.throws(()=>auditSourceAssertionsV2(copied),/materialization mismatch|digest mismatch/);
});

test('coherent invented alternative is internally valid, but an independent tip distinguishes it',()=>{
  const first=initial();
  const alternate=appendSourceAssertionV2(createSourceAssertionsV2('old-growth',workshop),
    arrival({sourceId:'entirely-different-source'}),0);
  // This green internal audit is NOT evidence that either source claim is true.
  assert.equal(auditSourceAssertionsV2(alternate).generation,1);
  assert.notEqual(alternate.tipDigest,first.tipDigest);
  assert.throws(()=>checkIndependentSourceTip(alternate,1,first.tipDigest),
    /Independent source-assertion tip mismatch/);
  assert.equal(checkIndependentSourceTip(first,1,first.tipDigest),true);
});
