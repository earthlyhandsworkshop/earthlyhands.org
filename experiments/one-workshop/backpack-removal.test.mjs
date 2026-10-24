// Source-matched simulated controls for the backpack removal door.
// These tests execute the page's actual inline handler with mock DOM/storage.
// They are not a real-browser, storage-quota, or cross-tab atomicity test.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {
  newBackpack, parseBackpack, receiveBackpack, putNote, removeNote,
  exportBackpack, MAX_BACKPACK_IMPORT_BYTES
} from './backpack.mjs';

const documentId = 'eh:public-lands:no3:p111';
const html = readFileSync(new URL('./backpack-walk.html', import.meta.url), 'utf8');
const inline = html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
assert.ok(inline, 'the backpack page must still have its module handler');
const script = inline.replace(/^import [^\n]+\n/gm, '');

function openPage(initial = null) {
  let stored = initial === null ? null : exportBackpack(initial);
  let writes = 0;
  const elements = Object.fromEntries(
    ['note', 'status', 'save', 'clear', 'export', 'import', 'rescue', 'rescue-row']
      .map(id => [id, {value: '', textContent: '', disabled: false, hidden: true}])
  );
  const document = {
    querySelector(selector) {
      const element = elements[selector.slice(1)];
      assert.ok(element, 'unexpected element ' + selector);
      return element;
    }
  };
  const localStorage = {
    getItem() { return stored; },
    setItem(_key, value) { writes++; stored = value; }
  };
  runInNewContext(script, {
    document, localStorage, newBackpack, parseBackpack, receiveBackpack,
    putNote, removeNote, exportBackpack, MAX_BACKPACK_IMPORT_BYTES,
    // Download APIs are not exercised by these removal tests.
    URL: {}, Blob: class {}, setTimeout() {}
  });
  return {
    elements,
    get stored() { return stored; },
    get writes() { return writes; },
    externalChange(value) { stored = value; }
  };
}

function saved(text) {
  return putNote(newBackpack('visitor:test'), documentId, 1, text);
}

test('remove refuses to discard a different unsaved draft', () => {
  const original = exportBackpack(saved('Saved A'));
  const page = openPage(saved('Saved A'));
  page.elements.note.value = 'Unsent B';
  page.elements.clear.onclick();
  assert.match(page.elements.status.textContent, /Remove refused: Unsaved writing/);
  assert.equal(page.elements.note.value, 'Unsent B');
  assert.equal(page.stored, original);
  assert.equal(page.writes, 0);
});

test('clean deliberate removal still removes the saved note', () => {
  const page = openPage(saved('Saved A'));
  assert.equal(page.elements.note.value, 'Saved A');
  page.elements.clear.onclick();
  assert.equal(parseBackpack(page.stored).entries.length, 0);
  assert.equal(page.elements.note.value, '');
  assert.equal(page.writes, 1);
});

test('new unsaved words with no existing note are preserved', () => {
  const page = openPage();
  page.elements.note.value = 'A beginning, not yet saved';
  page.elements.clear.onclick();
  assert.match(page.elements.status.textContent, /Remove refused: Unsaved writing/);
  assert.equal(page.elements.note.value, 'A beginning, not yet saved');
  assert.equal(page.stored, null);
  assert.equal(page.writes, 0);
});

test('a competing tab change refuses clean removal without overwriting it', () => {
  const page = openPage(saved('Saved A'));
  const intervening = exportBackpack(putNote(saved('Saved A'), 'eh:second', 1, 'From another tab'));
  page.externalChange(intervening);
  page.elements.clear.onclick();
  assert.match(page.elements.status.textContent, /Remove refused: Another tab changed/);
  assert.equal(page.elements.note.value, 'Saved A');
  assert.equal(page.stored, intervening);
  assert.equal(page.writes, 0);
});
