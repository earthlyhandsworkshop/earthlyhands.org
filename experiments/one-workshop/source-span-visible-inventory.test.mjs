// Invented data only. This tests a *visible receipt inventory*, never source
// authentication, export of historical files, or real access permissions.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SourceSpanCatalog, VISIBLE_INVENTORY_SCHEMA } from './source-span-catalog.mjs';
import { makeSourceSnapshot, bindSourceSpan } from './source-span.mjs';

const body = 'An invented journal contains a bounded observation.';
const phrase = 'bounded observation';
const snapshot = makeSourceSnapshot('fictional-journal','revision-1',body);
const alice = { authenticated:true, workshopMember:true, principalId:'alice' };
const bob = { authenticated:true, workshopMember:true, principalId:'bob' };
const workshop = { kind:'workshop' };
const bobPrivate = { kind:'private', ownerId:'bob' };
const named = n => 'span-' + String(n).padStart(4,'0');
const receipt = id => bindSourceSpan({
  id, snapshot, start:body.indexOf(phrase),
  end:body.indexOf(phrase)+phrase.length, exactText:phrase,
  originalPointer:'fictional:journal', originalLocator:'fictitious-face-1',
  originalMaker:'invented author', readingHand:'test reader',
  claim:'A fictional sentence.', limit:'No historical source verified.'
});
function setup(t) {
  const dir=mkdtempSync(join(tmpdir(),'source-span-inventory-'));
  const file=join(dir,'inventory.sqlite');
  const catalog=new SourceSpanCatalog(file);
  t.after(()=>{catalog.close();rmSync(dir,{recursive:true,force:true});});
  return {catalog,file};
}
function fingerprint(m) {
  return createHash('sha256')
    .update(JSON.stringify({schema:m.schema,count:m.count,entries:m.entries}))
    .digest('hex');
}

test('205 permitted receipts form one ordered, repeatable visible inventory; hidden rows stay absent',t=>{
  const {catalog,file}=setup(t);
  for(let i=0;i<205;i++) catalog.register(receipt(named(i)),snapshot,workshop,alice);
  for(const x of ['span-0005-hidden','span-0100-hidden'])
    catalog.register(receipt(x),snapshot,bobPrivate,bob);
  const m=catalog.captureVisibleInventory(alice);
  assert.equal(m.schema,VISIBLE_INVENTORY_SCHEMA);
  assert.equal(m.status,'unverified-fixture-inventory');
  assert.equal(m.count,205);
  assert.deepEqual(m.entries.map(x=>x.spanId),Array.from({length:205},(_,i)=>named(i)));
  assert.ok(m.entries.every(x=>x.parentDigest===snapshot.bodyDigest));
  assert.ok(m.entries.every(x=>x.scopeKind==='workshop'));
  assert.equal(m.sha256,fingerprint(m));
  assert.equal(JSON.stringify(m).includes(body),false);
  assert.equal(JSON.stringify(m).includes(phrase),false);
  const second=new SourceSpanCatalog(file);
  t.after(()=>second.close());
  assert.deepEqual(second.captureVisibleInventory(alice),m);
  assert.equal(catalog.captureVisibleInventory(bob).count,207);
});

test('a captured inventory remains an earlier set even when live keyset pages gain or miss inserts',t=>{
  const {catalog,file}=setup(t);
  catalog.register(receipt(named(1)),snapshot,workshop,alice);
  catalog.register(receipt(named(3)),snapshot,workshop,alice);
  const before=catalog.captureVisibleInventory(alice);
  const firstPage=catalog.listVisible(alice,1);
  const writer=new SourceSpanCatalog(file);
  t.after(()=>writer.close());
  writer.register(receipt(named(0)),snapshot,workshop,bob);
  writer.register(receipt(named(2)),snapshot,workshop,bob);
  const nextPage=catalog.listVisible(alice,100,firstPage.at(-1).spanId);
  assert.deepEqual(nextPage.map(x=>x.spanId),[named(2),named(3)]);
  assert.deepEqual(before.entries.map(x=>x.spanId),[named(1),named(3)]);
  const after=catalog.captureVisibleInventory(alice);
  assert.deepEqual(after.entries.map(x=>x.spanId),[named(0),named(1),named(2),named(3)]);
  assert.notEqual(before.sha256,after.sha256);
});

test('inventory fingerprint covers a row’s claimed registrar and original receipt bytes, not only its ID',t=>{
  const {catalog}=setup(t);
  catalog.register(receipt(named(1)),snapshot,workshop,alice);
  const before=catalog.captureVisibleInventory(alice);
  catalog.db.prepare('UPDATE source_span_catalog SET claimed_registrar=? WHERE span_id=?')
    .run('different-claimed-hand',named(1));
  const changedClaim=catalog.captureVisibleInventory(alice);
  assert.equal(changedClaim.count,before.count);
  assert.notEqual(changedClaim.sha256,before.sha256);
  catalog.db.prepare('UPDATE source_span_catalog SET record_json=? WHERE span_id=?')
    .run('{"different":"internally unverified"}',named(1));
  const changedRecord=catalog.captureVisibleInventory(alice);
  assert.equal(changedRecord.count,before.count);
  assert.notEqual(changedRecord.sha256,changedClaim.sha256);
  // Hashes detect differences from a separately held earlier snapshot; a
  // raw DB writer can forge a replacement inventory and matching new hash.
});

test('unauthenticated and wrong-compartment fixtures cannot enumerate source metadata',t=>{
  const {catalog}=setup(t);
  catalog.register(receipt(named(1)),snapshot,bobPrivate,bob);
  assert.equal(catalog.captureVisibleInventory(null),null);
  assert.equal(catalog.captureVisibleInventory({authenticated:false,principalId:'bob'}),null);
  const unseen=catalog.captureVisibleInventory(alice);
  assert.equal(unseen.count,0);
  assert.deepEqual(unseen.entries,[]);
  assert.equal(unseen.sha256,fingerprint(unseen));
  const owned=catalog.captureVisibleInventory(bob);
  assert.equal(owned.count,1);
  assert.equal(owned.entries[0].ownerId,'bob');
  assert.equal(owned.entries[0].scopeKind,'private');
});
