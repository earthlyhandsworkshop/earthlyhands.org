// Regression for the browser's former 200 KB ceiling mismatch.
// Source-level UI assertion is not a substitute for an actual browser walk.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseBackpack, exportBackpack, VERSION, MAX_BACKPACK_IMPORT_BYTES } from './backpack.mjs';

test('full valid backpack fits the same import limit used by the browser', () => {
  // Escaped NULs expand to six printable JSON bytes each, worst-case
  // for a valid 10,000-character note.
  const note=String.fromCharCode(0).repeat(10000);
  const value={schema:VERSION,owner:'test',entries:Array.from({length:100},(_,i)=>({
    document_id:'eh:test:'+i,source_revision:1,note
  }))};
  const exported=exportBackpack(value);
  const size=Buffer.byteLength(exported,'utf8');
  assert.ok(size>200_000,'must exceed old import limit');
  assert.ok(size<=MAX_BACKPACK_IMPORT_BYTES,'accepted export must be importable');
  assert.deepEqual(parseBackpack(exported),parseBackpack(value));
});

test('browser checks file size against shared import limit', () => {
  const page=readFileSync(new URL('./backpack-walk.html',import.meta.url),'utf8');
  assert.ok(page.includes('MAX_BACKPACK_IMPORT_BYTES'), 'UI imports named limit');
  assert.ok(page.includes('f.size>MAX_BACKPACK_IMPORT_BYTES'), 'UI enforces named limit');
  assert.ok(!page.includes('f.size>200_000'), 'UI must not regress to old limit');
});
