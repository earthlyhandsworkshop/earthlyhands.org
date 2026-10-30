// Fictional cross-instrument cold return: real Markdown revisions + derived SQLite
// source-span receipts. Neither the file sidecar nor the actor fields authenticate
// a historical source, a human identity, rights, or a publication grant.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync,
  cpSync, rmSync
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readCarrier, RECORD_SCHEMA } from './markdown-rebuild.mjs';
import { makeSourceSnapshot, bindSourceSpan } from './source-span.mjs';
import { SourceSpanCatalog } from './source-span-catalog.mjs';

const id='fictional-finger';
const alice={authenticated:true,workshopMember:true,principalId:'alice'};
const bob={authenticated:true,workshopMember:true,principalId:'bob'};
const workshop={kind:'workshop'};
const privateBob={kind:'private',ownerId:'bob'};
const council='The invented committee answered under instructions from the people.';
const accounts='The invented officer deferred a response to a later letter.';
const oldBody='Opening of fictional record.\n'+council+'\n'+
  'neutral filler '.repeat(50000)+'\n'+accounts+'\nEnd of fictional record.';
const revisedBody='A newly inserted fictional heading.\n'+oldBody;
const sha=text=>createHash('sha256').update(text,'utf8').digest('hex');
const receipt=(text,number)=>({
  revision:number,bytes:Buffer.byteLength(text,'utf8'),sha256:sha(text)
});

function makeHome(t) {
  const dir=mkdtempSync(join(tmpdir(),'source-span-carrier-cold-'));
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  return dir;
}
function putCarrier(root,texts) {
  const base=join(root,id);
  const revisions=join(base,'revisions');
  mkdirSync(revisions,{recursive:true});
  texts.forEach((text,i)=>writeFileSync(join(revisions,
    String(i+1).padStart(4,'0')+'.md'),text,'utf8'));
  const meta={
    schema:RECORD_SCHEMA,id,sourceClaim:'Invented carrier; no provenance authentication',
    rightsState:'unknown',revisions:texts.map((text,i)=>receipt(text,i+1)),
    publication:null
  };
  writeFileSync(join(base,'record.json'),JSON.stringify(meta,null,2)+'\n');
  return {base,meta};
}
function pinned(root,revision) {
  const carrier=readCarrier(root,id);
  const item=carrier.revisions[revision-1];
  if(!item) throw new Error('Requested carrier revision not present');
  return makeSourceSnapshot(id,String(revision),item.text);
}
function span(spanId,snapshot,phrase,hand) {
  const start=snapshot.body.indexOf(phrase);
  assert.notEqual(start,-1);
  return bindSourceSpan({
    id:spanId,snapshot,start,end:start+phrase.length,exactText:phrase,
    originalPointer:hand==='bob'?'fictional:account-letter':'fictional:council-journal',
    originalLocator:'invented-face-1',originalMaker:'invented original writer',
    readingHand:hand,claim:'A limited fictional reading.',
    limit:'No actual source, provenance, rights, or person is verified.'
  });
}

test('closed SQLite plus versioned Markdown carriers return independently in a fresh home',t=>{
  const root=makeHome(t),source=join(root,'source'),dest=join(root,'received');
  const sourceCarriers=join(source,'carriers');
  putCarrier(sourceCarriers,[oldBody,revisedBody]);
  assert.ok(oldBody.length>650000);
  const old=pinned(sourceCarriers,1),newer=pinned(sourceCarriers,2);
  assert.notEqual(old.bodyDigest,newer.bodyDigest);
  const sourceDb=join(source,'spans.sqlite');
  const writer=new SourceSpanCatalog(sourceDb);
  try {
    writer.register(span('council-old',old,council,'alice'),old,workshop,alice);
    writer.register(span('account-old',old,accounts,'bob'),old,privateBob,bob);
    writer.register(span('council-new',newer,council,'alice'),newer,workshop,alice);
  } finally { writer.close(); } // Complete WAL checkpoint before copying.
  mkdirSync(dest,{recursive:true});
  copyFileSync(sourceDb,join(dest,'spans.sqlite'));
  cpSync(sourceCarriers,join(dest,'carriers'),{recursive:true});
  const receiving=new SourceSpanCatalog(join(dest,'spans.sqlite'));
  t.after(()=>receiving.close());
  const receivedOld=pinned(join(dest,'carriers'),1);
  const receivedNew=pinned(join(dest,'carriers'),2);
  assert.equal(receiving.read('council-old',alice,receivedOld).exactText,council);
  assert.equal(receiving.read('council-new',alice,receivedNew).exactText,council);
  assert.equal(receiving.read('account-old',bob,receivedOld).exactText,accounts);
  assert.equal(receiving.read('account-old',alice,{body:'hostile'}),null);
  assert.deepEqual(receiving.listVisible(alice).map(r=>r.spanId),
    ['council-new','council-old']);
  assert.throws(()=>receiving.read('council-old',alice,receivedNew),
    /exact pinned parent snapshot/);
  // The database is an index, not a secret copy of the entire source.
  const rawIndex=readFileSync(join(dest,'spans.sqlite'),'utf8');
  assert.equal(rawIndex.includes(council),false);
  assert.equal(rawIndex.includes(accounts),false);
  // Removing the copied source makes new source-backed reads impossible.
  rmSync(join(dest,'carriers'),{recursive:true,force:true});
  assert.throws(()=>pinned(join(dest,'carriers'),1),/ENOENT/);
  assert.equal(receiving.listVisible(alice).length,2);
});

test('modified raw Markdown with its old receipt is refused before catalog read',t=>{
  const dir=makeHome(t),carriers=join(dir,'carriers');
  const {base}=putCarrier(carriers,[oldBody]);
  const old=pinned(carriers,1);
  const catalog=new SourceSpanCatalog(join(dir,'spans.sqlite'));
  t.after(()=>catalog.close());
  catalog.register(span('council-old',old,council,'alice'),old,workshop,alice);
  writeFileSync(join(base,'revisions','0001.md'),'changed '+oldBody);
  assert.throws(()=>pinned(carriers,1),/Markdown bytes disagree with receipt/);
  assert.deepEqual(catalog.listVisible(alice).map(x=>x.spanId),['council-old']);
});

test('self-consistent carrier rewrite still fails the separately pinned index digest',t=>{
  const dir=makeHome(t),carriers=join(dir,'carriers');
  const {base,meta}=putCarrier(carriers,[oldBody]);
  const old=pinned(carriers,1);
  const catalog=new SourceSpanCatalog(join(dir,'spans.sqlite'));
  t.after(()=>catalog.close());
  catalog.register(span('council-old',old,council,'alice'),old,workshop,alice);
  const rewritten='A different fictional first revision.\n'+oldBody;
  writeFileSync(join(base,'revisions','0001.md'),rewritten,'utf8');
  meta.revisions[0]=receipt(rewritten,1);
  writeFileSync(join(base,'record.json'),JSON.stringify(meta,null,2)+'\n');
  const apparentlyValid=pinned(carriers,1);
  assert.notEqual(apparentlyValid.bodyDigest,old.bodyDigest);
  assert.throws(()=>catalog.read('council-old',alice,apparentlyValid),
    /exact pinned parent snapshot/);
  assert.equal(catalog.read('council-old',alice,old).exactText,council);
  // Not an authentic witness: rewriting BOTH index and carriers can defeat
  // these local digest assertions, and neither rights nor identity is proved.
});
