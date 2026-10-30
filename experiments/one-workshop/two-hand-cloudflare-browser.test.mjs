import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('./two-hand-cloudflare/worker.mjs', import.meta.url), 'utf8');
const page = source.match(/const PAGE = \x60([\s\S]*?)\x60;\s*export async function handleTwoHand/);
assert.ok(page, 'exact committed Worker page must be present');
const code = page[1].match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
assert.ok(code, 'execute the exact current browser script, not a rewritten test copy');

function json(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, async json() { return body; } };
}
function browser(fetcher) {
  const buttons = new Map();
  const elements = new Map();
  for (const id of ['body', 'rev', 'status', 'save', 'refresh', 'export']) {
    elements.set(id, {
      value: '', textContent: '',
      addEventListener(event, fn) {
        if (event === 'click') buttons.set(id, fn);
      }
    });
  }
  let next = 0;
  const context = {
    fetch: fetcher,
    document: { getElementById(id) { return elements.get(id); } },
    crypto: { randomUUID() { return 'b4df2572-299b-49ad-b100-4ac6c185' + String(++next).padStart(4, '0'); } },
    URL, Blob, setTimeout
  };
  runInNewContext(code, context, { timeout: 2000 });
  return {
    get body() { return elements.get('body').value; },
    set body(value) { elements.get('body').value = value; },
    get status() { return elements.get('status').textContent; },
    get rev() { return elements.get('rev').textContent; },
    click(id) { return buttons.get(id)(); }
  };
}
async function flush() { await new Promise(resolve => setImmediate(resolve)); }

test('a second refresh cannot erase words typed before the first GET finishes', async () => {
  let releaseFirst;
  let calls = 0;
  const view = browser(() => {
    calls += 1;
    return new Promise(resolve => { releaseFirst = resolve; });
  });
  view.body = 'UNSAVED WORDS BEFORE THE FIRST LOAD';
  releaseFirst(json({ id: 'fictional-door', version: 0, body: 'server body' }));
  await flush();
  assert.equal(view.body, 'UNSAVED WORDS BEFORE THE FIRST LOAD');
  await view.click('refresh');
  assert.equal(calls, 1, 'second refresh must refuse before the network call');
  assert.match(view.status, /Refresh refused/);
  assert.equal(view.body, 'UNSAVED WORDS BEFORE THE FIRST LOAD');
});

test('a lost save response retries with identical request ID, preserving newer typed words', async () => {
  let current = { version: 0, body: 'seed' };
  const accepted = new Map();
  const attempts = [];
  const view = browser(async (url, options = {}) => {
    if (url === '/api/state' && !options.method) return json(current);
    if (url !== '/api/state' || options.method !== 'PUT') throw Error('unexpected route');
    const p = JSON.parse(options.body);
    attempts.push(p);
    if (accepted.has(p.requestId)) return json({ acceptedVersion: accepted.get(p.requestId), state: current, replay: true });
    if (p.expectedVersion !== current.version) return json({ error: 'stale_or_reused_request', currentVersion: current.version }, 409);
    current = { version: current.version + 1, body: p.body };
    accepted.set(p.requestId, current.version);
    if (attempts.length === 1) throw Error('server committed the write, but the response was lost');
    return json({ acceptedVersion: current.version, state: current, replay: false });
  });
  await flush();
  assert.equal(view.body, 'seed');
  view.body = 'first draft';
  await view.click('save');
  assert.equal(current.version, 1);
  assert.match(view.status, /outcome unknown/);
  view.body = 'newer writing while response was lost';
  await view.click('refresh');
  assert.match(view.status, /previous save is awaiting confirmation/);
  assert.equal(view.body, 'newer writing while response was lost');
  await view.click('save');
  assert.equal(attempts.length, 2);
  assert.equal(attempts[0].requestId, attempts[1].requestId);
  assert.equal(attempts[0].body, attempts[1].body);
  assert.equal(attempts[0].expectedVersion, attempts[1].expectedVersion);
  assert.equal(view.body, 'newer writing while response was lost');
  assert.match(view.status, /Earlier words saved/);
  await view.click('save');
  assert.equal(current.version, 2);
  assert.equal(current.body, 'newer writing while response was lost');
  assert.notEqual(attempts[1].requestId, attempts[2].requestId);
  assert.equal(attempts[2].expectedVersion, 1);
});

test('save before initial read gives a usable retained-draft warning instead of silence', async () => {
  let releaseFirst;
  const view = browser(() => new Promise(resolve => { releaseFirst = resolve; }));
  view.body = 'I started before the first revision reached my phone.';
  await view.click('save');
  assert.match(view.status, /Cannot save before the first server revision loads/);
  assert.match(view.status, /Copy your draft words before clearing the box/);
  assert.equal(view.body, 'I started before the first revision reached my phone.');
  releaseFirst(json({ id: 'fictional-door', version: 0, body: 'seed' }));
  await flush();
  assert.equal(view.body, 'I started before the first revision reached my phone.');
  await view.click('refresh');
  assert.match(view.status, /Refresh refused/);
  assert.equal(view.body, 'I started before the first revision reached my phone.');
});

test('a definite invalid_write rejection releases the key for a corrected attempt', async () => {
  let current = { version: 0, body: 'seed' };
  const submitted = [];
  const view = browser(async (url, options = {}) => {
    if (url === '/api/state' && !options.method) return json(current);
    if (url !== '/api/state' || options.method !== 'PUT') throw Error('unexpected route');
    const payload = JSON.parse(options.body);
    submitted.push(payload);
    if (new TextEncoder().encode(payload.body).byteLength > 8192) return json({ error: 'invalid_write' }, 400);
    if (payload.expectedVersion !== current.version) return json({ error: 'stale_or_reused_request', currentVersion: current.version }, 409);
    current = { version: current.version + 1, body: payload.body };
    return json({ acceptedVersion: current.version, state: current, replay: false });
  });
  await flush();
  view.body = 'x'.repeat(8193);
  await view.click('save');
  assert.match(view.status, /Save was refused: invalid_write/);
  assert.equal(view.body.length, 8193);
  assert.equal(current.version, 0);
  view.body = 'Corrected fictional line.';
  await view.click('save');
  assert.equal(submitted.length, 2);
  assert.notEqual(submitted[0].requestId, submitted[1].requestId);
  assert.equal(current.version, 1);
  assert.equal(current.body, 'Corrected fictional line.');
  assert.match(view.status, /Saved in shared database/);
});
