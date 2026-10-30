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
          // A live storage event may now mark the first tab stale before its import.
          await firstTab.waitForFunction(() => document.querySelector('#status').textContent.includes('IMPORT REFUSED'));
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


    await t.test('a cross-tab edit observed before any click remains blocking after exact byte reversion', async () => {
      const context = await browser.newContext({acceptDownloads: true});
      try {
        const original = journal('opening receipt');
        const changed = journal('opening receipt', 'other tab receipt');
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
        // No import, download or release action has happened on the first tab.
        await firstTab.waitForFunction(() =>
          document.querySelector('#status').textContent.includes('ANOTHER TAB CHANGED THE JOURNAL'));
        assert.equal(await firstTab.locator('#release').isDisabled(), true);
        await secondTab.evaluate(({key, value}) => localStorage.setItem(key, value), {
          key: KEY, value: original
        });
        await firstTab.locator('#folio-file').setInputFiles({
          name: 'late-fictional.json', mimeType: 'application/json',
          buffer: Buffer.from(native('should not overwrite'))
        });
        await firstTab.locator('#add').click();
        await firstTab.waitForFunction(() =>
          document.querySelector('#status').textContent.includes('IMPORT REFUSED'));
        assert.match(await firstTab.locator('#status').textContent(), /earlier tab conflict/);
        assert.equal(await firstTab.evaluate(key => localStorage.getItem(key), KEY), original);
        assert.match(await firstTab.locator('#held').textContent(), /1 version/);
      } finally {
        await context.close();
      }
    });

    await t.test('real Chromium: refused browser save cannot release the tab-only new version', async () => {
      const context = await browser.newContext({acceptDownloads: true});
      try {
        const original = journal('first');
        const page = await context.newPage();
        // Seed an existing journal, then inject a storage-write refusal.
        // This uses real Chromium events, but SIMULATES quota failure;
        // it does not demonstrate an actual browser quota being exhausted.
        await page.addInitScript(({key, value}) => {
          localStorage.setItem(key, value);
          const actualSetItem = Storage.prototype.setItem;
          Storage.prototype.setItem = function (nextKey, nextValue) {
            if (this === localStorage && nextKey === key) {
              throw new DOMException('simulated full storage', 'QuotaExceededError');
            }
            return actualSetItem.call(this, nextKey, nextValue);
          };
        }, {key: KEY, value: original});
        await page.goto(url);
        assert.match(await page.locator('#held').textContent(), /1 version/);

        await page.locator('#folio-file').setInputFiles({
          name: 'fictional-second.json', mimeType: 'application/json',
          buffer: Buffer.from(native('second'))
        });
        await page.locator('#add').click();
        await page.waitForFunction(() =>
          document.querySelector('#status').textContent.includes('in this tab ONLY'));

        assert.match(await page.locator('#held').textContent(), /2 version/);
        assert.equal(await page.locator('#release').isDisabled(), true);
        // A direct dispatched click must also be refused, not merely greyed out.
        await page.locator('#release').evaluate(button =>
          button.dispatchEvent(new Event('click', {bubbles: true})));
        assert.match(await page.locator('#status').textContent(), /RELEASE REFUSED/);
        assert.equal(await page.evaluate(key => localStorage.getItem(key), KEY), original);

        // The sole surviving new version must remain exportable, clearly unverified.
        page.once('dialog', dialog => { void dialog.accept(); });
        const [download] = await Promise.all([
          page.waitForEvent('download'),
          page.locator('#export').click()
        ]);
        assert.match(download.suggestedFilename(), /earlier-or-unverified-copy/);
        const carried = JSON.parse(await readFile(await download.path(), 'utf8'));
        assert.equal(carried.receipts.length, 2);
        assert.equal(carried.receipts[1].raw_json, native('second'));
        assert.equal(await page.evaluate(key => localStorage.getItem(key), KEY), original);
      } finally {
        await context.close();
      }
    });


    await t.test('a delayed same-tab import cannot replace a newer completed import', async () => {
      const context = await browser.newContext({acceptDownloads: true});
      try {
        const page = await context.newPage();
        await page.goto(url);
        await page.evaluate(() => {
          const read = Blob.prototype.text;
          File.prototype.text = function () {
            if (this.name !== 'delayed-first.json') return read.call(this);
            const file = this;
            return new Promise((resolve, reject) => {
              window.finishFolioRead = () => read.call(file).then(resolve, reject);
            });
          };
        });

        await page.locator('#folio-file').setInputFiles({
          name: 'delayed-first.json', mimeType: 'application/json',
          buffer: Buffer.from(native('delayed first'))
        });
        await page.locator('#add').click();
        await page.waitForFunction(() => typeof window.finishFolioRead === 'function');

        await page.locator('#folio-file').setInputFiles({
          name: 'immediate-second.json', mimeType: 'application/json',
          buffer: Buffer.from(native('completed second'))
        });
        await page.locator('#add').click();
        await page.waitForFunction(() =>
          document.querySelector('#status').textContent.includes('VERSION RECEIVED'));

        await page.evaluate(() => window.finishFolioRead());
        await page.waitForFunction(() =>
          document.querySelector('#status').textContent.includes('Another local operation finished'));

        const saved = await page.evaluate(key => localStorage.getItem(key), KEY);
        assert.equal(JSON.parse(saved).receipts.length, 1);
        assert.equal(JSON.parse(saved).receipts[0].raw_json, native('completed second'));
        assert.match(await page.locator('#status').textContent(), /IMPORT REFUSED/);
      } finally {
        await context.close();
      }
    });

    await t.test('a delayed same-tab import cannot resurrect a released journal', async () => {
      const context = await browser.newContext({acceptDownloads: true});
      try {
        const page = await context.newPage();
        await page.addInitScript(({key, value}) => localStorage.setItem(key, value), {
          key: KEY, value: journal('held earlier')
        });
        await page.goto(url);
        await page.evaluate(() => {
          const read = Blob.prototype.text;
          File.prototype.text = function () {
            if (this.name !== 'delayed-after-release.json') return read.call(this);
            const file = this;
            return new Promise((resolve, reject) => {
              window.finishFolioRead = () => read.call(file).then(resolve, reject);
            });
          };
        });
        await page.locator('#folio-file').setInputFiles({
          name: 'delayed-after-release.json', mimeType: 'application/json',
          buffer: Buffer.from(native('must not resurrect'))
        });
        await page.locator('#add').click();
        await page.waitForFunction(() => typeof window.finishFolioRead === 'function');

        page.once('dialog', dialog => { void dialog.accept(); });
        await page.locator('#release').click();
        assert.equal(await page.evaluate(key => localStorage.getItem(key), KEY), null);
        assert.match(await page.locator('#held').textContent(), /No versions received/);

        await page.evaluate(() => window.finishFolioRead());
        await page.waitForFunction(() =>
          document.querySelector('#status').textContent.includes('Another local operation finished'));

        assert.equal(await page.evaluate(key => localStorage.getItem(key), KEY), null);
        assert.match(await page.locator('#held').textContent(), /No versions received/);
        assert.match(await page.locator('#status').textContent(), /IMPORT REFUSED/);
      } finally {
        await context.close();
      }
    });

  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
