import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { makeSourceSnapshot, bindSourceSpan, readSourceSpan } from './source-span.mjs';
import { proposeSourceSpanReanchor } from './source-span-reanchor.mjs';

// A UTF-8 encoding alias, NOT a cryptographic SHA-256 collision.
const oldUtf8Hash = text => createHash('sha256').update(text,'utf8').digest('hex');
const phrase='The fictional clerk promises a response in a future letter.';
const pointer={originalPointer:'fictional:ledger-A',originalLocator:'leaf-7',
  originalMaker:'fictional clerk',readingHand:'reader-1',
  claim:'Response is proposed, not received.',limit:'No later reply appears here.'};
function receipt(snapshot){
  const start=snapshot.body.indexOf(phrase);
  return bindSourceSpan({id:'future-reply',snapshot,start,end:start+phrase.length,
    exactText:phrase,...pointer});
}

test('isolated high/low surrogates are refused before lossy UTF-8 hashing',()=>{
  const good='prefix \uFFFD suffix';
  for(const bad of ['prefix \uD800 suffix','prefix \uDC00 suffix']){
    assert.notEqual(bad,good);
    assert.equal(oldUtf8Hash(bad),oldUtf8Hash(good));
    assert.throws(()=>makeSourceSnapshot('finger','v1',bad),/ill-formed UTF-16/);
  }
  assert.equal(makeSourceSnapshot('finger','v1',good).body,good);
  assert.doesNotThrow(()=>makeSourceSnapshot('finger','v1','prefix 🧭 suffix'));
});

test('a changed parent body cannot impersonate a pinned snapshot through a UTF-8 alias',()=>{
  const good='introduction: \uFFFD\n'+phrase+'\nending';
  const bad='introduction: \uD800\n'+phrase+'\nending';
  assert.notEqual(good,bad);
  assert.equal(oldUtf8Hash(good),oldUtf8Hash(bad));
  const original=makeSourceSnapshot('finger','v1',good);
  const oldRecord=receipt(original);
  assert.equal(readSourceSpan(oldRecord,original).exactText,phrase);
  assert.throws(()=>readSourceSpan(oldRecord,{...original,body:bad}),/snapshot|digest mismatch/i);
});

test('a reanchor refuses a lossy-alias target with a valid-looking digest',()=>{
  const good='beginning \uFFFD\n'+phrase+'\nending';
  const bad='beginning \uDC00\n'+phrase+'\nending';
  assert.equal(oldUtf8Hash(good),oldUtf8Hash(bad));
  const old=makeSourceSnapshot('finger','v1',good);
  const target=makeSourceSnapshot('finger','v2',good);
  assert.equal(proposeSourceSpanReanchor(receipt(old),old,target).status,'single-candidate');
  assert.throws(()=>proposeSourceSpanReanchor(receipt(old),old,{...target,body:bad}),
    /ill-formed UTF-16/);
});
