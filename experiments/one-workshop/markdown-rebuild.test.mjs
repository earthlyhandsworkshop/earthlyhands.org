import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, unlinkSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { RECORD_SCHEMA, readCarrier, rebuildIndex, readDerivedIndex } from './markdown-rebuild.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
function fixture(t, {rightsState='affirmed',publication={revision:2,approvalClaim:'fictional-review'}}={}) {
  const base=mkdtempSync(join(tmpdir(),'workshop-markdown-rebuild-'));
  t.after(()=>rmSync(base,{recursive:true,force:true}));
  const root=join(base,'carriers'), folder=join(root,'leaf-one'),revisions=join(folder,'revisions');
  mkdirSync(revisions,{recursive:true});
  const contents=[Buffer.from('# Arrival\r\n\r\nCafé\r\n'),
    Buffer.from('# Approved\n\nA fictional public paragraph.\n'),
    Buffer.from('# Private continuation\n\nNot approved.\n')];
  const receipts=contents.map((bytes,i)=>{
    writeFileSync(join(revisions,String(i+1).padStart(4,'0')+'.md'),bytes);
    return {revision:i+1,bytes:bytes.length,sha256:sha(bytes)};
  });
  const record={schema:RECORD_SCHEMA,id:'leaf-one',sourceClaim:'invented-jacket',rightsState,revisions:receipts,publication};
  const sidecar=join(folder,'record.json');writeFileSync(sidecar,JSON.stringify(record));
  return {base,root,folder,revisions,contents,record,sidecar,db:join(base,'index.sqlite')};
}
test('real Markdown bytes and line endings survive indexing and full index rebuild',t=>{
  const f=fixture(t);
  const original=f.contents.map(b=>Buffer.from(b));
  assert.deepEqual(rebuildIndex(f.root,f.db),{indexed:1,revisions:3});
  const first=readDerivedIndex(f.db);
  assert.equal(first[0].latest_revision,3);
  assert.equal(first[0].public_revision,2);
  assert.equal(first[0].public_text,f.contents[1].toString('utf8'));
  assert.ok(!first[0].public_text.includes('Private continuation'));
  unlinkSync(f.db);
  assert.deepEqual(rebuildIndex(f.root,f.db),{indexed:1,revisions:3});
  assert.deepEqual(readDerivedIndex(f.db),first);
  for(let i=0;i<3;i++) assert.deepEqual(readFileSync(join(f.revisions,String(i+1).padStart(4,'0')+'.md')),original[i]);
});
test('unknown rights never create a public projection even with a claimed approval',t=>{
  const f=fixture(t,{rightsState:'unknown'});
  rebuildIndex(f.root,f.db);
  assert.equal(readDerivedIndex(f.db)[0].public_text,null);
  assert.equal(readDerivedIndex(f.db)[0].public_revision,null);
});
test('changed Markdown bytes refuse rebuild and leave prior derived index untouched',t=>{
  const f=fixture(t);rebuildIndex(f.root,f.db);
  const prior=readDerivedIndex(f.db);
  writeFileSync(join(f.revisions,'0002.md'),'modified without receipt');
  assert.throws(()=>rebuildIndex(f.root,f.db),/Markdown bytes disagree/);
  assert.deepEqual(readDerivedIndex(f.db),prior);
});
test('unknown custody field refuses normalization; original carrier is retained',t=>{
  const f=fixture(t);rebuildIndex(f.root,f.db);
  const prior=readDerivedIndex(f.db);
  writeFileSync(f.sidecar,JSON.stringify({...f.record,permission_history:['future']}));
  assert.throws(()=>rebuildIndex(f.root,f.db),/Unsupported Markdown sidecar/);
  assert.deepEqual(readDerivedIndex(f.db),prior);
  assert.ok(readFileSync(f.sidecar,'utf8').includes('permission_history'));
});
test('extra unreceipted revision refuses index rebuild rather than silently ignoring it',t=>{
  const f=fixture(t);rebuildIndex(f.root,f.db);
  writeFileSync(join(f.revisions,'0004.md'),'unsourced fourth revision');
  assert.throws(()=>readCarrier(f.root,'leaf-one'),/Unreceipted Markdown revision/);
});
