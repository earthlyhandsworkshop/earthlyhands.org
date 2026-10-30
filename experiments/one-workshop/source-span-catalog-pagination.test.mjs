// Fictional keyset paging experiment. The browser, identity fields, and
// access compartments here are fixtures, not live user authentication.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { SourceSpanCatalog } from './source-span-catalog.mjs';
import { makeSourceSnapshot, bindSourceSpan } from './source-span.mjs';

const body='A fictional finger contains one bounded sentence.';
const quote='one bounded sentence';
const snapshot=makeSourceSnapshot('invented-finger','revision-one',body);
const alice={authenticated:true,workshopMember:true,principalId:'alice'};
const bob={authenticated:true,workshopMember:true,principalId:'bob'};
const workshop={kind:'workshop'};
const privateBob={kind:'private',ownerId:'bob'};
const spanId=n=>'span-'+String(n).padStart(4,'0');
const receipt=id=>bindSourceSpan({
  id,snapshot,start:body.indexOf(quote),
  end:body.indexOf(quote)+quote.length,exactText:quote,
  originalPointer:'fictional:journal',originalLocator:'invented-face-1',
  originalMaker:'invented recorder',readingHand:'invented reader',
  claim:'A bounded invented reading.',limit:'No real source or rights verified.'
});
function open(t){
  const dir=mkdtempSync(join(tmpdir(),'source-span-page-'));
  const filename=join(dir,'spans.sqlite');
  const catalog=new SourceSpanCatalog(filename);
  t.after(()=>{catalog.close();rmSync(dir,{recursive:true,force:true});});
  return {catalog,filename};
}

test('more than two full pages remain discoverable without duplicates or skipped visible records',t=>{
  const {catalog}=open(t);
  const wanted=Array.from({length:205},(_,i)=>spanId(i));
  for(const id of wanted) catalog.register(receipt(id),snapshot,workshop,alice);
  catalog.register(receipt('span-0050-hidden'),snapshot,privateBob,bob);
  catalog.register(receipt('span-0100-hidden'),snapshot,privateBob,bob);
  let after=null;
  const seen=[],pageSizes=[];
  for(let pageNumber=0;pageNumber<5;pageNumber++){
    const page=catalog.listVisible(alice,100,after);
    pageSizes.push(page.length);
    seen.push(...page.map(row=>row.spanId));
    if(page.length<100) break;
    after=page.at(-1).spanId;
  }
  assert.deepEqual(pageSizes,[100,100,5]);
  assert.deepEqual(seen,wanted);
  assert.equal(new Set(seen).size,205);
  assert.deepEqual(catalog.listVisible(alice,100,spanId(204)),[]);
  assert.deepEqual(catalog.listVisible(bob,100,'span-0050').map(x=>x.spanId).slice(0,2),
    ['span-0050-hidden','span-0051']);
});

test('cursor starts strictly after its exact ID, with hidden records not consuming LIMIT',t=>{
  const {catalog}=open(t);
  for(const n of [1,2,3]) catalog.register(receipt(spanId(n)),snapshot,workshop,alice);
  catalog.register(receipt('span-0002-hidden'),snapshot,privateBob,bob);
  assert.deepEqual(catalog.listVisible(alice,1,spanId(2)).map(x=>x.spanId),
    [spanId(3)]);
  assert.deepEqual(catalog.listVisible(bob,1,spanId(2)).map(x=>x.spanId),
    ['span-0002-hidden']);
  assert.deepEqual(catalog.listVisible(alice,3,spanId(3)),[]);
});

test('invalid cursors are refused and unauthorized callers still see no records',t=>{
  const {catalog}=open(t);
  catalog.register(receipt(spanId(1)),snapshot,workshop,alice);
  for(const invalid of ['',12,'space in cursor','x'.repeat(129),{},false])
    assert.throws(()=>catalog.listVisible(alice,2,invalid),/cursor/);
  assert.deepEqual(catalog.listVisible({authenticated:false,principalId:'alice'},5,spanId(1)),[]);
  assert.deepEqual(catalog.listVisible(null,5,spanId(1)),[]);
});

test('page cursors are positions, not a claim of repeatable snapshot isolation',t=>{
  const {catalog,filename}=open(t);
  catalog.register(receipt(spanId(1)),snapshot,workshop,alice);
  catalog.register(receipt(spanId(3)),snapshot,workshop,alice);
  const first=catalog.listVisible(alice,1);
  assert.deepEqual(first.map(x=>x.spanId),[spanId(1)]);
  const secondWriter=new SourceSpanCatalog(filename);
  t.after(()=>secondWriter.close());
  secondWriter.register(receipt(spanId(2)),snapshot,workshop,bob);
  assert.deepEqual(catalog.listVisible(alice,2,first[0].spanId).map(x=>x.spanId),
    [spanId(2),spanId(3)]);
  // A later insertion *before* the cursor is not visited on this walk.
  secondWriter.register(receipt('span-0000'),snapshot,workshop,bob);
  assert.deepEqual(catalog.listVisible(alice,2,first[0].spanId).map(x=>x.spanId),
    [spanId(2),spanId(3)]);
});
