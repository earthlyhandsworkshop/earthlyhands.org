import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSourceSnapshot,bindSourceSpan,readSourceSpan} from './source-span.mjs';
import {proposeSourceSpanReanchor as propose, REANCHOR_SCHEMA,MAX_CANDIDATES} from './source-span-reanchor.mjs';

const phrase='The clerk promised to answer after the audit, not during it.';
const old=makeSourceSnapshot('fictional-finger','revision-7',
  'first-page\nnearby link https://wrong.invalid\n' + phrase + '\nlast-page');
const start=old.body.indexOf(phrase);
const record=bindSourceSpan({id:'audit-promise',snapshot:old,start,end:start+phrase.length,
  exactText:phrase,originalPointer:'fictional:original-letter',originalLocator:'page-3',
  originalMaker:'fictional clerk',readingHand:'Reader Two',
  claim:'Reply was promised for later.',limit:'No later reply is recorded here.'});
const next=s=>makeSourceSnapshot(old.fileId,'revision-8',s);

test('same pinned body and revision need no relocation',()=>{
  const r=propose(record,old,old);
  assert.equal(r.status,'already-pinned');
  assert.equal(r.requiresIndependentReview,false);
  assert.equal(r.adopted,false);
});

test('prefix insertion yields one candidate at shifted offset, never auto-adopted',()=>{
  const revised=next('NEW PREFACE\n'+old.body);
  const r=propose(record,old,revised);
  assert.equal(r.schema,REANCHOR_SCHEMA);
  assert.equal(r.status,'single-candidate');
  assert.deepEqual([r.candidates[0].start,r.candidates[0].end],
    [start+'NEW PREFACE\n'.length,start+'NEW PREFACE\n'.length+phrase.length]);
  assert.deepEqual(r.candidates[0].context,{before:true,after:true});
  assert.equal(r.adopted,false);
  assert.equal(r.requiresIndependentReview,true);
  assert.equal(Object.hasOwn(r,'source'),false);
  assert.equal(Object.hasOwn(r,'reading'),false);
  assert.throws(()=>readSourceSpan(r,revised),/Unsupported/);
});

test('two copies are ambiguous even when one has identical neighborhood',()=>{
  const r=propose(record,old,next(old.body+'\nreprint: '+phrase));
  assert.equal(r.status,'ambiguous');
  assert.equal(r.candidates.length,2);
  assert.equal(r.candidates[0].context.before,true);
  assert.equal(r.requiresIndependentReview,true);
});

test('missing exact words is not a claim the historical statement never existed',()=>{
  const r=propose(record,old,next(old.body.replace(phrase,'[text moved elsewhere]')));
  assert.equal(r.status,'not-found');
  assert.equal(r.candidates.length,0);
  assert.equal(r.adopted,false);
});

test('unique phrase inserted into unrelated setting is still only a candidate',()=>{
  const r=propose(record,old,next('completely new section\n'+phrase+'\nnew ending'));
  assert.equal(r.status,'single-candidate');
  assert.equal(r.candidates[0].context.before,false);
  assert.equal(r.candidates[0].context.after,false);
  assert.equal(r.requiresIndependentReview,true);
});

test('a different parent file is a provenance decision, not an automatic reanchor',()=>{
  const s=makeSourceSnapshot('another-document','revision-8',old.body);
  assert.throws(()=>propose(record,old,s),/Different parent file/);
});

test('reusing a revision after changing bytes refuses',()=>{
  const s=makeSourceSnapshot(old.fileId,old.revision,'changed\n'+old.body);
  assert.throws(()=>propose(record,old,s),/Revision reused/);
});

test('false target digest, unsupported fields and tampered prior record refuse',()=>{
  const s=next('prefix\n'+old.body);
  assert.throws(()=>propose(record,old,{...s,bodyDigest:'0'.repeat(64)}),/digest mismatch/);
  assert.throws(()=>propose(record,old,{...s,isPublic:true}),/exact source snapshot/);
  const bogus=structuredClone(record);bogus.reading.readingHand='Substitute';
  assert.throws(()=>propose(bogus,old,s),/record mismatch/);
});

test('more than eight matches never causes unbounded candidate output',()=>{
  const s=next('x '.repeat(3)+Array(25).fill(phrase).join(' | '));
  const r=propose(record,old,s);
  assert.equal(r.status,'many-candidates');
  assert.equal(r.candidates.length,MAX_CANDIDATES);
  assert.equal(r.candidateLimitReached,true);
  assert.equal(r.requiresIndependentReview,true);
});

test('new identical body at a fresh revision is still not an approved new pointer',()=>{
  const r=propose(record,old,next(old.body));
  assert.equal(r.status,'single-candidate');
  assert.deepEqual([r.candidates[0].start,r.candidates[0].end],[start,start+phrase.length]);
  assert.equal(r.requiresIndependentReview,true);
});

test('unpaired UTF-16 refuses at ingress before a reanchor candidate can be proposed',()=>{
  assert.throws(()=>makeSourceSnapshot('fictional-lone-low','v1','A\uDC00B'),/ill-formed UTF-16/);
  assert.throws(()=>makeSourceSnapshot('fictional-lone-high','v1','A\uD800B'),/ill-formed UTF-16/);
  assert.doesNotThrow(()=>makeSourceSnapshot('fictional-pair','v1','A\uD800\uDC00B'));
});
