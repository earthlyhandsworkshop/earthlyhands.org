import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { verifyPublicationEdition, normalizedAssets, safeR2Key, toSafeLocalPath } from '../verify-publication-edition.mjs';

const sha = data => createHash('sha256').update(data).digest('hex');
const html = Buffer.from(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Anonymous archival inquiry · synthetic</title><link rel="canonical" href="https://work.example.org/work/inquiry/"></head><body><main><h1>Anonymous archival inquiry</h1><a href="/work/inquiry/source.md">Read credited source note</a><a href="mailto:research@example.org?subject=Source%20inquiry%20ID-0001&amp;body=Page%20https%3A%2F%2Fwork.example.org%2Fwork%2Finquiry%2F">Send a source lead</a></main></body></html>`);
const source = Buffer.from('# Source note (synthetic fixture)\nNo actual historical people, holdings, claims, or permissions are represented.\n');
const htmlKey = `workshop/edition/sha256-${sha(html)}/page.html`;
const sourceKey = `workshop/edition/sha256-${sha(source)}/source.md`;
const objects = new Map([[htmlKey, html], [sourceKey, source]]);
const load = async key => {
  if (!objects.has(key)) throw Error('not found');
  return objects.get(key);
};
function manifestGl() {
  return {work:'Synthetic inquiry',edition:'v1',current_html:{key:htmlKey,sha256:sha(html),bytes:html.length},current_source:{key:sourceKey,sha256:sha(source),bytes:source.length},permissions:'synthetic only: no public rights or publication approval'};
}
function manifestTN() {
  return {work:'Synthetic inquiry',canonical_public_url:'https://work.example.org/work/inquiry/',public_state:'released_and_browser_read (claim only; unverified)',public_source_url:'https://work.example.org/work/inquiry/source.md',public_assets:[{name:'page',key:htmlKey,sha:sha(html),bytes:html.length,type:'text/html; charset=utf-8'},{name:'source',key:sourceKey,sha:sha(source),bytes:source.length,type:'text/markdown'}]};
}

test('Glean-style actual release-manifest shape: exact bytes pass, authorization does not follow', async () => {
  const a=await verifyPublicationEdition(manifestGl(),load);
  assert.equal(a.status,'technical_bytes_and_structure_pass');
  assert.equal(a.publication_authorized,false);
  assert.equal(a.assets_examined,2);
  assert.equal(a.errors.length,0);
  assert.equal(a.review_still_required.length,7);
});
test('True-North-style release-manifest shape: claimed browser approval is not independently proved', async () => {
  const a=await verifyPublicationEdition(manifestTN(),load);
  assert.equal(a.status,'technical_bytes_and_structure_pass');
  assert.equal(a.publication_authorized,false);
  assert.equal(a.receipt_claim_not_reverified,'released_and_browser_read (claim only; unverified)');
});
test('one changed byte fails SHA and length cannot disguise it', async () => {
  const a=await verifyPublicationEdition(manifestGl(),async key=>key===htmlKey?Buffer.from(html.toString('utf8').replace('inquiry</h1>','inquiry!</h1>')):load(key));
  assert.equal(a.status,'technical_hold');
  assert.ok(a.errors.includes('page:sha256_mismatch'));
});
test('a staged edition with only a generic contact and no source road fails to pass', async () => {
  const altered=Buffer.from(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width"><title>Draft</title></head><body><main><h1>Draft</h1><a href="mailto:research@example.org">Email</a></main></body></html>`);
  const key=`workshop/edition/sha256-${sha(altered)}/page.html`,m=manifestTN();
  m.public_assets[0]={name:'page',key,sha:sha(altered),bytes:altered.length,type:'text/html'};
  const a=await verifyPublicationEdition(m,async k=>k===key?altered:load(k));
  assert.equal(a.status,'technical_hold');
  assert.ok(a.errors.includes('page:missing_source_reading_link'));
  assert.ok(a.errors.includes('page:contact_is_not_page_specific'));
});
test('private, traversal, and absent paths cannot escape into a public receipt', async () => {
  assert.equal(safeR2Key('../private/original.pdf'),false);
  assert.equal(safeR2Key('/etc/shadow'),false);
  assert.equal(safeR2Key('a\\b'),false);
  assert.throws(()=>toSafeLocalPath('/tmp/exact','../private/original.pdf'),/Unsafe/);
  const m=manifestGl();m.current_source.key='../private/original.pdf';
  const a=await verifyPublicationEdition(m,load);
  assert.equal(a.status,'technical_hold');
  assert.ok(a.errors.includes('source:unsafe_object_key'));
});
test('missing source object cannot pass even with an apparently valid receipt', async()=>{
  const a=await verifyPublicationEdition(manifestTN(),async k=>k===sourceKey?Promise.reject(Error('private')):load(k));
  assert.equal(a.status,'technical_hold');
  assert.ok(a.errors.includes('source:object_unavailable'));
});
test('manifest R2 key must carry its claimed hash', async()=>{
  const wrongKey=`workshop/edition/sha256-${'0'.repeat(64)}/page.html`;
  const m=manifestTN();m.public_assets[0].key=wrongKey;
  const a=await verifyPublicationEdition(m,async k=>k===wrongKey?html:load(k));
  assert.equal(a.status,'technical_hold');
  assert.ok(a.errors.includes('page:r2_key_sha_disagrees_with_manifest'));
});
test('unsupported receipt shapes are refused, not silently normalized',()=>{
  assert.throws(()=>normalizedAssets({artworks:[1]}),/Unsupported receipt/);
});

test('a stale canonical URL cannot masquerade as the intended current edition', async()=>{
  const m=manifestTN();m.canonical_public_url='https://work.example.org/work/another-edition/';
  const r=await verifyPublicationEdition(m,load);
  assert.equal(r.status,'technical_hold');
  assert.ok(r.errors.includes('page:canonical_url_does_not_match_release_receipt'));
});
