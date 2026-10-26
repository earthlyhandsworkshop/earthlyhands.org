// A real-Chromium, fictional-data walk of the draft native folio journal.
// This is NOT a multi-user, account-security, or production deployment test.
// Run separately from the dependency-free Node suite after installing Playwright.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {chromium} from 'playwright';
import {emptyFolioHistory,receiveFolioVersion,exportFolioHistory} from './native-folio-history.mjs';

const KEY = 'earthlyhands.one-workshop.native-folio-history.111.v0';
const allowed = new Set([
  'native-folio-history-walk.html',
  'native-folio-history.mjs',
  'unrecognized-storage-rescue.mjs',
  'native-folio-pocket.mjs'
]);
const pageName = 'native-folio-history-walk.html';

function native(note) {
  return JSON.stringify({
    v: 1, source: 'public-lands-return-3-face-111',
    format: 'Earthly Hands / Public Lands / folio v1',
    workingReadingEdition: 'fictional-test', note, occurrences: [], marks: []
  });
}
function journal(...notes) {
  let history = emptyFolioHistory();
  for (const note of notes) history = receiveFolioVersion(history, native(note));
  return exportFolioHistory(history);
}
async function downloadEnvelope(page) {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#rescue').click()
  ]);
  return JSON.parse(await readFile(await download.path(), 'utf8'));
}

test('real Chromium: damaged-journal rescue and intervening tab history', async t => {
  const server = createServer(async (request, response) => {
    const path = new URL(request.url, 'http://localhost').pathname.slice(1);
    if (!allowed.has(path)) {
      response.writeHead(404).end('not found');
      return;
    }
    try {
      const file = new URL('./' + path, import.meta.url);
      const bytes = await readFile(file);
      response.writeHead(200, {
        'Content-Type': path.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/javascript; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
      });
      response.end(bytes);
    } catch {
      response.writeHead(500).end('failed to load experimental fixture');
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  let browser;
  try {
    browser = await chromium.launch({
      channel: 'chrome', headless: true, args: ['--no-sandbox']
    });
    const url = 'http://127.0.0.1:' + server.address().port + '/' + pageName;

    await t.test('unpaired UTF-16 surrogate survives actual browser download; stored data stays untouched', async () => {
      const context = await browser.newContext({acceptDownloads: true});
      try {
        const damaged = 'not-valid-json-' + String.fromCharCode(0xd800) + '-end';
        const page = await context.newPage();
        await page.addInitScript(({key, value}) => localStorage.setItem(key, value), {
          key: KEY, value: damaged
        });
        await page.goto(url);
        assert.equal(await page.locator('#rescue').isVisible(), true);
        assert.equal(await page.locator('#add').isDisabled(), true);
        assert.equal(await page.locator('#release').isDisabled(), true);
        const first = await downloadEnvelope(page);
        assert.equal(first.stored_string, damaged);
        assert.equal(first.storage_key, KEY);
        assert.equal(await page.evaluate(key => localStorage.getItem(key), KEY), damaged);

        // The download still represents the opening capture, not the newer tab's data.
        const secondTab = await context.newPage();
        await secondTab.goto(url);
        await secondTab.evaluate(({key, value}) => localStorage.setItem(key, value), {
          key: KEY, value: 'a later other-tab value'
        });
        const afterIntervention = await downloadEnvelope(page);
        assert.equal(afterIntervention.stored_string, damaged);
        assert.equal(await secondTab.evaluate(key => localStorage.getItem(key), KEY),
          'a later other-tab value');
      } finally {
        await context.close();
      }
    });

    await t.test('a real second tab cannot make an earlier observed conflict disappear by reverting bytes', async () => {
      const context = await browser.newContext({acceptDownloads: true});
      try {
        const original = journal('first');
        const changed = journal('first', 'second');
        const firstTab = await context.newPage();
        await firstTab.addInitScript(({key, value}) => localStorage.setItem(key, value), {
          key: KEY, value: original
        });
        await firstTab.goto(url);
        const secondTab = await context.newPage();
        await secondTab.goto(url);
        await secondTab.evaluate(({key, value}) => localStorage.setItem(key, value), {
          key: KEY, value: changed
        });

        async function attempt(text) {
          await firstTab.locator('#folio-file').setInputFiles({
            name: 'fictional-source.json', mimeType: 'application/json',
            buffer: Buffer.from(native(text))
          });
          await firstTab.locator('#add').click();
          // File.text() is asynchronous; a completed click is not a completed import.
          const expected = text === 'refused after reversion'
            ? 'earlier tab conflict' : 'Another tab changed';
          await firstTab.waitForFunction(needle => document.querySelector('#status').textContent.includes(needle), expected);
          return await firstTab.locator('#status').textContent();
        }
        assert.match(await attempt('refused first attempt'), /IMPORT REFUSED/);
        await secondTab.evaluate(({key, value}) => localStorage.setItem(key, value), {
          key: KEY, value: original
        });
        assert.match(await attempt('refused after reversion'), /earlier tab conflict/);
        assert.equal(await firstTab.evaluate(key => localStorage.getItem(key), KEY), original);
      } finally {
        await context.close();
      }
    });
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
