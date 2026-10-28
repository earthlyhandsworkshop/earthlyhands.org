// End-to-end tests for the fictional, disposable first walk.
// They do not exercise a deployed service or any real Workshop holding.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runFirstWalk } from './first-walk.mjs';

const entrypoint = fileURLToPath(new URL('./first-walk.mjs', import.meta.url));

function check(receipt) {
  assert.equal(receipt.specimen, 'fictional-json-sqlite-bundle');
  assert.equal(receipt.sourceRevisions, 3);
  assert.equal(receipt.receivedRevisions, 4);
  assert.equal(receipt.pinnedPublicRevision, 2);
  assert.equal(receipt.privateDraftNotPublished, true);
  assert.equal(receipt.sourceUnchanged, true);
  assert.equal(receipt.binaryBytesVerified, 256 * 1024);
  assert.match(receipt.binarySHA256, /^[0-9a-f]{64}$/);
  assert.equal(receipt.scratchRemoved, true);
  assert.equal(receipt.deployment, 'none');
}

test('reversible first walk checks private/public history and binary integrity', async () => {
  check(await runFirstWalk());
});

test('the one-command CLI prints the verified fictional return receipt', () => {
  const result = spawnSync(process.execPath, [entrypoint],
    { encoding: 'utf8', timeout: 30000 });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  check(JSON.parse(result.stdout));
});

test('CLI refuses unrecognized input rather than handling user or live files', () => {
  const result = spawnSync(process.execPath, [entrypoint, '--source=real'],
    { encoding: 'utf8', timeout: 30000 });
  assert.ifError(result.error);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /No arguments accepted/);
});
