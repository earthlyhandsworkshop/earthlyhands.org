// Fictional, local-only integration walk. NOT a website, source migration, or multi-user service.
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SqliteDocumentStore } from './sqlite-store.mjs';
import { fingerprintBlob, receiveVerifiedBlob, verifyBlob } from './blob-integrity.mjs';
import { exportPortableBundle, importPortableBundle } from './portable-bundle.mjs';

const RELEASE = '# Fictional approved leaf\n\nA public question.\n';
const PRIVATE = '# Fictional private continuation\n\nUnpublished work.\n';
const RECEIVED = '# Fictional receiver continuation\n\nA new local draft.\n';

export async function runFirstWalk() {
  const scratch = mkdtempSync(join(tmpdir(), 'one-workshop-first-walk-'));
  let sender, receiver, receipt;
  try {
    sender = new SqliteDocumentStore(join(scratch, 'sender.sqlite'));
    receiver = new SqliteDocumentStore(join(scratch, 'receiver.sqlite'));
    sender.save(RELEASE, 1);
    sender.approve(2);
    sender.save(PRIVATE, 3);
    const senderBefore = sender.readWorking();
    const releaseBefore = sender.readPublic();

    const file = join(scratch, 'invented-binary');
    writeFileSync(file, Buffer.alloc(256 * 1024, 0x7c));
    const blob = await fingerprintBlob(file);
    const source = join(scratch, 'source-objects');
    const destination = join(scratch, 'received-objects');
    await receiveVerifiedBlob(file, source, blob);
    const bundle = await exportPortableBundle(sender, source, [blob]);
    const imported = await importPortableBundle(receiver, source, destination,
      bundle.manifest, bundle.documentText);
    assert.equal(imported.generation, 2);
    assert.deepEqual(receiver.readWorking().document, senderBefore.document);
    assert.deepEqual(receiver.readPublic(), releaseBefore);
    assert.equal(receiver.readPublic().revision, 2);
    assert.equal(receiver.readPublic().content, RELEASE);
    assert.equal(receiver.readWorking().document.history.at(-1).content, PRIVATE);
    assert.ok(!JSON.stringify(receiver.readPublic()).includes(PRIVATE));
    const checked = await verifyBlob(join(destination, blob.object_key), blob);
    assert.equal(checked.bytes, 256 * 1024);

    receiver.save(RECEIVED, 2);
    assert.equal(receiver.readPublic().content, RELEASE);
    assert.deepEqual(sender.readWorking(), senderBefore);
    assert.deepEqual(sender.readPublic(), releaseBefore);
    receipt = {
      specimen: 'fictional-json-sqlite-bundle',
      sourceRevisions: senderBefore.document.history.length,
      receivedRevisions: receiver.readWorking().document.history.length,
      pinnedPublicRevision: receiver.readPublic().revision,
      privateDraftNotPublished: true,
      sourceUnchanged: true,
      binaryBytesVerified: checked.bytes,
      binarySHA256: checked.sha256,
      deployment: 'none'
    };
  } finally {
    try { receiver?.close(); } finally {
      try { sender?.close(); } finally {
        rmSync(scratch, { recursive: true, force: true });
      }
    }
  }
  assert.equal(existsSync(scratch), false);
  return { ...receipt, scratchRemoved: true };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 2) throw new Error('No arguments accepted');
    console.log(JSON.stringify(await runFirstWalk(), null, 2));
  } catch (error) {
    console.error('Fictional first walk failed: ' + error.message);
    process.exitCode = 1;
  }
}
