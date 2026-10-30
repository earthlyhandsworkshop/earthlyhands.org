// Executes the real export handler against simulated DOM/storage; not a browser test.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {
  newBackpack, parseBackpack, receiveBackpack, putNote, removeNote,
  exportBackpack, MAX_BACKPACK_IMPORT_BYTES
} from './backpack.mjs';

const docId = 'eh:public-lands:no3:p111';
const html = readFileSync(new URL('./backpack-walk.html', import.meta.url), 'utf8');
const inline = html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
assert.ok(inline, 'page must expose its module handler');
const script = inline.replace(/^import [^\n]+\n/gm, '');

function openPage(initial = null) {
  let stored = initial === null ? null : exportBackpack(initial);
  const downloads = [];
  const clicked = [];
  const elements = Object.fromEntries(
    ['note', 'status', 'save', 'clear', 'export', 'import', 'rescue', 'rescue-row']
      .map(id => [id, {value: '', textContent: '', disabled: false, hidden: true}])
  );
  const document = {
    querySelector(selector) {
      const el = elements[selector.slice(1)];
      assert.ok(el, 'unexpected element ' + selector);
      return el;
    },
    createElement(tag) {
      assert.equal(tag, 'a');
      return {href: '', download: '', click() {clicked.push(this.download);}};
    }
  };
  const localStorage = {
    getItem() {return stored;},
    setItem(_key, value) {stored = value;}
  };
  const URL = {
    createObjectURL(blob) {downloads.push(blob.parts.join('')); return 'blob:test';},
    revokeObjectURL() {}
  };
  class BlobMock {constructor(parts) {this.parts = parts;}}
  runInNewContext(script, {
    document, localStorage, URL, Blob: BlobMock, setTimeout() {},
    newBackpack, parseBackpack, receiveBackpack, putNote, removeNote,
    exportBackpack, MAX_BACKPACK_IMPORT_BYTES
  });
  return {elements, downloads, clicked, get stored() {return stored;}};
}
function saved(note) {return putNote(newBackpack('visitor:test'), docId, 1, note);}

test('edited unsaved words prevent exporting an obsolete copy', () => {
  const original = exportBackpack(saved('Saved A'));
  const page = openPage(saved('Saved A'));
  page.elements.note.value = 'Unsent B';
  page.elements.export.onclick();
  assert.match(page.elements.status.textContent, /Export refused: Unsaved writing/);
  assert.equal(page.elements.note.value, 'Unsent B');
  assert.equal(page.stored, original);
  assert.equal(page.downloads.length, 0);
  assert.equal(page.clicked.length, 0);
});

test('brand-new unsaved words cannot masquerade as an empty backpack export', () => {
  const page = openPage();
  page.elements.note.value = 'New writing';
  page.elements.export.onclick();
  assert.match(page.elements.status.textContent, /Export refused: Unsaved writing/);
  assert.equal(page.downloads.length, 0);
  assert.equal(page.stored, null);
});

test('clean saved writing exports the expected portable copy', () => {
  const page = openPage(saved('Saved A'));
  page.elements.export.onclick();
  assert.equal(page.clicked.length, 1);
  assert.equal(page.downloads.length, 1);
  assert.equal(parseBackpack(page.downloads[0]).entries[0].note, 'Saved A');
});

test('saving new writing before export includes it', () => {
  const page = openPage();
  page.elements.note.value = 'Written';
  page.elements.save.onclick();
  page.elements.export.onclick();
  assert.equal(page.clicked.length, 1);
  assert.equal(parseBackpack(page.downloads[0]).entries[0].note, 'Written');
});
