import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SqliteDocumentStore } from './sqlite-store.mjs';
import { fingerprintBlob, receiveVerifiedBlob, verifyBlob } from './blob-integrity.mjs';
import { BUNDLE_SCHEMA, parseBundleManifest, exportPortableBundle, importPortableBundle } from './portable-bundle.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'one-workshop-portable-'));
  t.after(() => rmSync(root, { recursive:true, force:true }));
  const a = new SqliteDocumentStore(join(root, 'a.sqlite'));
  const b = new SqliteDocumentStore(join(root, 'b.sqlite'));
  t.after(() => { a.close(); b.close(); });
  return { root, a, b, source:join(root, 'source-objects'), target:join(root, 'target-objects') };
}

async function prepare(t) {
  const f = fixture(t);
  f.a.save('Release 2', 1);
  f.a.approve(2);
  f.a.save('Private revision 3', 3);
  const bytesPath = join(f.root, 'fictional-scan');
  writeFileSync(bytesPath, Buffer.alloc(3 * 1024 * 1024, 0x7c));
  f.blob = await fingerprintBlob(bytesPath);
  await receiveVerifiedBlob(bytesPath, f.source, f.blob);
  f.bundle = await exportPortableBundle(f.a, f.source, [f.blob]);
  return f;
}

test('portable round trip preserves working history, pinned public release and 3 MiB object', async t => {
  const f = await prepare(t);
  assert.equal(f.bundle.manifest.schema, BUNDLE_SCHEMA);
  const result = await importPortableBundle(f.b, f.source, f.target,
    JSON.stringify(f.bundle.manifest), f.bundle.documentText);
  assert.equal(result.generation, 2);
  assert.deepEqual(f.b.readPublic(), f.a.readPublic());
  assert.equal(f.b.readPublic().content, 'Release 2');
  assert.equal(f.b.readWorking().document.history.at(-1).content, 'Private revision 3');
  assert.ok(!JSON.stringify(f.b.readPublic()).includes('Private revision 3'));
  assert.deepEqual(await verifyBlob(join(f.target, f.blob.object_key), f.blob), f.blob);
  f.b.save('More private draft', 2);
  assert.equal(f.b.readPublic().content, 'Release 2');
});

test('altered document cannot import or install accompanying binary', async t => {
  const f = await prepare(t);
  const previous = f.b.readWorking();
  await assert.rejects(importPortableBundle(f.b, f.source, f.target,
    f.bundle.manifest, f.bundle.documentText.replace('Release 2', 'Release X')),
    /Document bytes disagree/);
  assert.deepEqual(f.b.readWorking(), previous);
  assert.equal(existsSync(f.target), false);
});

test('a changed source object prevents import of metadata or binary', async t => {
  const f = await prepare(t);
  writeFileSync(join(f.source, f.blob.object_key), Buffer.alloc(f.blob.bytes, 0x32));
  await assert.rejects(importPortableBundle(f.b, f.source, f.target,
    f.bundle.manifest, f.bundle.documentText), /integrity mismatch/);
  assert.equal(f.b.readWorking().generation, 1);
  assert.equal(f.b.readPublic(), null);
  assert.equal(existsSync(f.target), false);
});

test('an existing destination cannot be overwritten even with a valid manifest', async t => {
  const f = await prepare(t);
  f.b.save('Another companion working', 1);
  await assert.rejects(importPortableBundle(f.b, f.source, f.target,
    f.bundle.manifest, f.bundle.documentText), /destination has live work/);
  assert.equal(f.b.readWorking().document.history.at(-1).content, 'Another companion working');
  assert.equal(existsSync(f.target), false);
});

test('malformed envelope and duplicate blob claims are rejected', async t => {
  const f = await prepare(t);
  assert.throws(() => parseBundleManifest({...f.bundle.manifest, schema:'unknown'}), /Invalid portable/);
  assert.throws(() => parseBundleManifest({ ...f.bundle.manifest,
    blobs:{...f.bundle.manifest.blobs,objects:[f.blob,f.blob]}}), /Duplicate object/);
});

test('a writer racing the final restore wins without losing work or publishing imported draft', async t => {
  const f = await prepare(t);
  const simultaneousWriter = {
    readWorking: () => f.b.readWorking(),
    readPublic: () => f.b.readPublic(),
    restore: (text, expected) => {
      // Insert a competing edit precisely after object verification and before
      // the destination's generation-conditional metadata crossing.
      f.b.save('Concurrent hand won', 1);
      return f.b.restore(text, expected);
    }
  };
  await assert.rejects(importPortableBundle(simultaneousWriter, f.source, f.target,
    f.bundle.manifest, f.bundle.documentText), /Version conflict/);
  assert.equal(f.b.readWorking().document.history.at(-1).content, 'Concurrent hand won');
  assert.equal(f.b.readPublic(), null);
  // Complete, verified but unreferenced objects are allowed after a late failure.
  assert.deepEqual(await verifyBlob(join(f.target, f.blob.object_key), f.blob), f.blob);
});
