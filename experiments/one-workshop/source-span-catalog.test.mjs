import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SourceSpanCatalog } from './source-span-catalog.mjs';
import { makeSourceSnapshot, bindSourceSpan } from './source-span.mjs';

const actorA={authenticated:true,workshopMember:true,principalId:'alice'};
const actorB={authenticated:true,workshopMember:true,principalId:'bob'};
const guest={authenticated:false,principalId:'outsider'};
const workshop={kind:'workshop'};
const privateB={kind:'private',ownerId:'bob'};
const belloB={kind:'bello-player',ownerId:'bob',matchId:'match-2'};
const phraseA='The fictional council chose a committee, subject to instructions.';
const phraseB='The fictional auditor expected a response in a future letter.';
const body='front\n'+phraseA+'\nhttps://wrong.invalid/nearby\n'+
  'filler '.repeat(94000)+'\n'+phraseB+'\nback';
const snapshot=makeSourceSnapshot('fake-finger','rev-7',body);
const bind=(spanId, phrase, source, reader)=>{
  const start=body.indexOf(phrase);
  return bindSourceSpan({id:spanId,snapshot,start,end:start+phrase.length,
    exactText:phrase,originalPointer:source,originalLocator:'leaf-1',
    originalMaker:'fictional original writer',readingHand:reader,
    claim:'An expressly bounded reading.',limit:'No outside source was authenticated.'});
};
const first=bind('claim-one',phraseA,'fictional:source-A','reader-one');
const second=bind('claim-two',phraseB,'fictional:source-B','reader-two');
function setup(t) {
  const dir=mkdtempSync(join(tmpdir(),'source-span-catalog-'));
  const filename=join(dir,'catalog.sqlite');
  const catalog=new SourceSpanCatalog(filename);
  t.after(()=>{catalog.close();rmSync(dir,{recursive:true,force:true});});
  return {catalog,filename};
}

test('two passages share a giant parent but stay separately addressable and attributed',t=>{
  const {catalog}=setup(t);
  assert.ok(body.length>650000);
  catalog.register(first,snapshot,workshop,actorA);
  catalog.register(second,snapshot,privateB,actorB);
  assert.deepEqual(catalog.listVisible(actorA).map(x=>x.spanId),['claim-one']);
  assert.deepEqual(catalog.listVisible(actorB).map(x=>x.spanId),['claim-one','claim-two']);
  const one=catalog.read('claim-one',actorA,snapshot);
  const two=catalog.read('claim-two',actorB,snapshot);
  assert.equal(one.exactText,phraseA);
  assert.equal(two.exactText,phraseB);
  assert.equal(one.source.originalPointer,'fictional:source-A');
  assert.equal(two.source.originalPointer,'fictional:source-B');
  assert.equal(two.reading.readingHand,'reader-two');
  assert.equal(two.rightsVerified,false);
  assert.equal(two.originalSourceIndependentlyInspected,false);
});

test('missing and forbidden spans look equally absent; private metadata is not listed',t=>{
  const {catalog}=setup(t);
  catalog.register(second,snapshot,privateB,actorB);
  assert.equal(catalog.read('claim-two',actorA,snapshot),null);
  assert.equal(catalog.read('does-not-exist',actorA,snapshot),null);
  assert.equal(catalog.read('claim-two',guest,snapshot),null);
  assert.deepEqual(catalog.listVisible(actorA),[]);
  assert.deepEqual(catalog.listVisible(guest),[]);
  // An unauthorized read never examines a hostile or incomplete snapshot.
  assert.equal(catalog.read('claim-two',actorA,{body:'forged'}),null);
});

test('a permitted read needs the original exact revision and bytes, not just a record ID',t=>{
  const {catalog}=setup(t);
  catalog.register(first,snapshot,workshop,actorA);
  assert.throws(()=>catalog.read('claim-one',actorA,
    makeSourceSnapshot(snapshot.fileId,'rev-8',body)),/pinned parent snapshot/);
  assert.throws(()=>catalog.read('claim-one',actorA,
    makeSourceSnapshot(snapshot.fileId,'rev-7',body.replace('front','other'))),/pinned parent snapshot/);
  assert.throws(()=>catalog.read('claim-one',actorA,null),/snapshot/);
});

test('a duplicate stable ID cannot overwrite the earlier source, even from another connection',t=>{
  const {catalog,filename}=setup(t);
  const secondConnection=new SourceSpanCatalog(filename);
  t.after(()=>secondConnection.close());
  catalog.register(first,snapshot,workshop,actorA);
  const altered=bind('claim-one',phraseB,'fictional:alternative','reader-two');
  assert.throws(()=>secondConnection.register(altered,snapshot,workshop,actorB),/UNIQUE|constraint/i);
  assert.equal(secondConnection.read('claim-one',actorB,snapshot).exactText,phraseA);
  secondConnection.register(second,snapshot,privateB,actorB);
  assert.equal(catalog.read('claim-two',actorB,snapshot).exactText,phraseB);
});

test('a verified record survives close and reopen without retaining source body bytes',t=>{
  const {catalog,filename}=setup(t);
  catalog.register(first,snapshot,workshop,actorA);
  const reopened=new SourceSpanCatalog(filename);
  t.after(()=>reopened.close());
  assert.equal(reopened.read('claim-one',actorA,snapshot).exactText,phraseA);
  const columns=reopened.db.prepare('PRAGMA table_info(source_span_catalog)').all().map(x=>x.name);
  assert.equal(columns.includes('body'),false);
  assert.equal(columns.includes('original_text'),false);
  assert.equal(JSON.stringify(reopened.db.prepare('SELECT * FROM source_span_catalog').all()).includes(body),false);
});

test('publication and unsupported access metadata refuse; claimed actor must match fixture scope',t=>{
  const {catalog}=setup(t);
  assert.throws(()=>catalog.register(first,snapshot,{kind:'public'},actorA),/Publication/);
  assert.throws(()=>catalog.register(first,snapshot,{kind:'private',ownerId:'bob',public:true},actorB),/metadata/);
  assert.throws(()=>catalog.register(first,snapshot,privateB,actorA),/authorized/);
  assert.throws(()=>catalog.register(first,snapshot,workshop,guest),/authorized/);
  assert.deepEqual(catalog.listVisible(actorA),[]);
});

test('Bello player/match scope hides the same player in a different match',t=>{
  const {catalog}=setup(t);
  catalog.register(second,snapshot,belloB,{...actorB,matchId:'match-2'});
  assert.equal(catalog.read('claim-two',{...actorB,matchId:'match-3'},snapshot),null);
  assert.deepEqual(catalog.listVisible({...actorB,matchId:'match-3'}),[]);
  assert.equal(catalog.read('claim-two',{...actorB,matchId:'match-2'},snapshot).exactText,phraseB);
});

test('hidden first records do not consume the visible page limit',t=>{
  const {catalog}=setup(t);
  const hidden=bind('aaa-hidden',phraseB,'fictional:private','reader-hidden');
  const shown=bind('zzz-visible',phraseA,'fictional:workshop','reader-shown');
  catalog.register(hidden,snapshot,privateB,actorB);
  catalog.register(shown,snapshot,workshop,actorA);
  assert.deepEqual(catalog.listVisible(actorA,1).map(x=>x.spanId),['zzz-visible']);
  assert.deepEqual(catalog.listVisible(actorB,1).map(x=>x.spanId),['aaa-hidden']);
  assert.throws(()=>catalog.listVisible(actorA,101),/page size/);
});

test('an altered stored record is refused at exact source readback',t=>{
  const {catalog}=setup(t);
  catalog.register(first,snapshot,workshop,actorA);
  const r=JSON.parse(catalog.db.prepare('SELECT record_json FROM source_span_catalog WHERE span_id=?').get(first.id).record_json);
  r.source.originalPointer='fictional:forged';
  catalog.db.prepare('UPDATE source_span_catalog SET record_json=? WHERE span_id=?').run(JSON.stringify(r),first.id);
  assert.throws(()=>catalog.read(first.id,actorA,snapshot),/record mismatch/);
});


test('index read supports the full 128-character source-span identity grammar',t=>{
  const {catalog}=setup(t);
  const longId='L'+'e'.repeat(127);
  const longRecord=bind(longId,phraseA,'fictional:long-id','reader-long');
  catalog.register(longRecord,snapshot,workshop,actorA);
  assert.equal(catalog.read(longId,actorA,snapshot).id,longId);
  assert.throws(()=>catalog.read(longId+'e',actorA,snapshot),/Invalid source-span ID/);
});
