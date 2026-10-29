// Entirely fictional parent-revision consistency tests for the draft catalog.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SourceSpanCatalog } from './source-span-catalog.mjs';
import { makeSourceSnapshot, bindSourceSpan } from './source-span.mjs';

const alice={authenticated:true,workshopMember:true,principalId:'alice'};
const workshop={kind:'workshop'};
const sentence='The imaginary council wrote a conditional instruction.';
const changed='Different invented text that cannot be the same revision.';
const baseBody='Preface. '+sentence+' End.';
const changedBody='Preface. '+changed+' End.';
function bind(id, snapshot, quote) {
  const start=snapshot.body.indexOf(quote);
  return bindSourceSpan({id,snapshot,start,end:start+quote.length,exactText:quote,
    originalPointer:'fictional:page1',originalLocator:'face1',originalMaker:'fictional writer',
    readingHand:'alice',claim:'An unverified reading.',limit:'Invented only.'});
}
function setup(t) {
  const dir=mkdtempSync(join(tmpdir(),'parent-version-'));
  const filename=join(dir,'catalog.sqlite');
  const catalog=new SourceSpanCatalog(filename);
  t.after(()=>{catalog.close();rmSync(dir,{recursive:true,force:true});});
  return {catalog,filename};
}

test('a second distinct body cannot claim the same file ID and revision through another SQLite connection', t=>{
  const {catalog,filename}=setup(t);
  const second=new SourceSpanCatalog(filename);
  t.after(()=>second.close());
  const original=makeSourceSnapshot('fake-finger','rev-7',baseBody);
  const conflict=makeSourceSnapshot('fake-finger','rev-7',changedBody);
  catalog.register(bind('claim-a',original,sentence),original,workshop,alice);
  assert.notEqual(original.bodyDigest,conflict.bodyDigest);
  assert.throws(()=>second.register(bind('claim-b',conflict,changed),conflict,workshop,alice),
    /Conflicting pinned parent revision/);
  assert.deepEqual(second.listVisible(alice).map(x=>x.spanId),['claim-a']);
  assert.equal(second.read('claim-a',alice,original).exactText,sentence);
  assert.equal(second.read('claim-b',alice,conflict),null);
});

test('a different revision of the same file can have different complete bytes',t=>{
  const {catalog}=setup(t);
  const old=makeSourceSnapshot('fake-finger','rev-7',baseBody);
  const next=makeSourceSnapshot('fake-finger','rev-8',changedBody);
  catalog.register(bind('claim-old',old,sentence),old,workshop,alice);
  catalog.register(bind('claim-new',next,changed),next,workshop,alice);
  assert.deepEqual(catalog.listVisible(alice).map(x=>x.spanId),['claim-new','claim-old']);
});

test('identical revision text may support multiple separately identified passages',t=>{
  const {catalog}=setup(t);
  const old=makeSourceSnapshot('fake-finger','rev-7',baseBody);
  catalog.register(bind('claim-a',old,sentence),old,workshop,alice);
  catalog.register(bind('claim-b',old,sentence),old,workshop,alice);
  assert.deepEqual(catalog.listVisible(alice).map(x=>x.spanId),['claim-a','claim-b']);
});

test('file identity is part of the version key',t=>{
  const {catalog}=setup(t);
  const old=makeSourceSnapshot('fake-finger','rev-7',baseBody);
  const another=makeSourceSnapshot('other-finger','rev-7',changedBody);
  catalog.register(bind('claim-a',old,sentence),old,workshop,alice);
  catalog.register(bind('claim-b',another,changed),another,workshop,alice);
  assert.equal(catalog.read('claim-b',alice,another).exactText,changed);
});
