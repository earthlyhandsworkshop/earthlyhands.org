// Future v1 custody fields must not vanish during a v0 export/import.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { newDocument, approveRevision, exportDocument, parseDocument } from './model.mjs';
import { BLOB_SCHEMA, parseFingerprint } from './blob-integrity.mjs';
import { MANIFEST_SCHEMA, parseBlobManifest } from './blob-transfer.mjs';
import { BUNDLE_SCHEMA, parseBundleManifest, importPortableBundle } from './portable-bundle.mjs';
import { SqliteDocumentStore } from './sqlite-store.mjs';

const sha='a'.repeat(64);
const object={schema:BLOB_SCHEMA,bytes:1,sha256:sha,object_key:'sha256/'+sha};
const blobs={schema:MANIFEST_SCHEMA,objects:[object]};
const document={encoding:'utf8-json',bytes:1,sha256:sha};
const bundle={schema:BUNDLE_SCHEMA,document,blobs};

test('recognized v0 carriers continue to round trip exactly',()=>{
  const doc=approveRevision(newDocument(),1);
  assert.deepEqual(parseDocument(exportDocument(doc)),doc);
  assert.deepEqual(parseFingerprint(JSON.stringify(object)),object);
  assert.deepEqual(parseBlobManifest(JSON.stringify(blobs)),blobs);
  assert.deepEqual(parseBundleManifest(JSON.stringify(bundle)),bundle);
});

test('document root, individual revision, and published-snapshot fields cannot be silently stripped',()=>{
  const doc=approveRevision(newDocument(),1);
  const root={...doc,provenance:{source:'future-rights-ledger'}};
  const revision=structuredClone(doc);
  revision.history[0].witnesses=['unmerged-custody-claim'];
  const published=structuredClone(doc);
  published.publication.permission_history=['not-yet-resolved'];
  assert.throws(()=>parseDocument(root),/Unrecognized document fields/);
  assert.throws(()=>exportDocument(root),/Unrecognized document fields/);
  assert.throws(()=>parseDocument(revision),/Invalid revision history/);
  assert.throws(()=>parseDocument(published),/Public release/);
});

test('binary fingerprint and manifest reject unfamiliar custody fields',()=>{
  assert.throws(()=>parseFingerprint({...object,provenance:['not-a-hash']}),/Invalid object fingerprint/);
  assert.throws(()=>parseBlobManifest({...blobs,rights_history:['pending']}),/Invalid blob manifest/);
  assert.throws(()=>parseBlobManifest({...blobs,objects:[{...object,source_permission:'unknown'}]}),
    /Invalid object fingerprint/);
});

test('portable bundle rejects unrecognized fields at each nested manifest boundary',()=>{
  assert.throws(()=>parseBundleManifest({...bundle,custody_chain:[]}),/Invalid portable bundle/);
  assert.throws(()=>parseBundleManifest({...bundle,document:{...document,source_ref:'future'}}),
    /Invalid portable bundle/);
  assert.throws(()=>parseBundleManifest({...bundle,blobs:{...blobs,provenance:'future'}}),
    /Invalid blob manifest/);
  assert.throws(()=>parseBundleManifest({...bundle,blobs:{...blobs,
    objects:[{...object,permission_review:'future'}]}}),/Invalid object fingerprint/);
});

test('a well-fingerprinted future document is refused before destination metadata or binaries change',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'workshop-unknown-custody-'));
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const target=join(dir,'target.sqlite'),objects=join(dir,'objects');
  const store=new SqliteDocumentStore(target);
  t.after(()=>store.close());
  const future=JSON.stringify({...newDocument(),source_rights_history:['unreviewed']});
  const bytes=Buffer.byteLength(future,'utf8');
  const fingerprint=createHash('sha256').update(future,'utf8').digest('hex');
  const envelope={schema:BUNDLE_SCHEMA,document:{encoding:'utf8-json',bytes,sha256:fingerprint},
    blobs:{schema:MANIFEST_SCHEMA,objects:[]}};
  const before=store.readWorking();
  await assert.rejects(importPortableBundle(store,join(dir,'sources'),objects,envelope,future),
    /Unrecognized document fields/);
  assert.deepEqual(store.readWorking(),before);
  assert.equal(store.readPublic(),null);
  assert.equal(existsSync(objects),false);
});
