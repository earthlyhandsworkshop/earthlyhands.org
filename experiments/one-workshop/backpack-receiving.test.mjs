// Contract for receiving a visitor's exported backpack without destroying local notes.
// Model tests only: browser storage, concurrent tabs, and real downloads remain unproven.
import test from 'node:test';
import assert from 'node:assert/strict';
import {newBackpack, putNote, receiveBackpack, exportBackpack} from './backpack.mjs';

const owner = 'visitor:test';
const note = (document, text, revision=1) =>
  putNote(newBackpack(owner), document, revision, text);

test('disjoint arrival adds its entry and preserves the local entry and inputs', () => {
  const local=note('eh:local', 'Written here');
  const arriving=note('eh:arriving', 'Written elsewhere');
  const localBefore=structuredClone(local), arrivingBefore=structuredClone(arriving);
  const result=receiveBackpack(local, exportBackpack(arriving));
  assert.deepEqual(result.entries, [local.entries[0], arriving.entries[0]]);
  assert.deepEqual(local, localBefore);
  assert.deepEqual(arriving, arrivingBefore);
});

test('an identical receipt can return repeatedly without duplicate entries', () => {
  const local=note('eh:local','A');
  const arriving=putNote(local, 'eh:arriving',1,'B');
  const first=receiveBackpack(local, arriving);
  const second=receiveBackpack(first, exportBackpack(arriving));
  assert.deepEqual(second, first);
  assert.equal(second.entries.length,2);
});

test('different writing for the same document is refused, not replaced', () => {
  const local=note('eh:shared','The original wording');
  const arriving=note('eh:shared','A different version');
  const before=structuredClone(local);
  assert.throws(()=>receiveBackpack(local, arriving), /Conflicting annotation/);
  assert.deepEqual(local, before);
});

test('different pinned source revisions are also a conflict', () => {
  const local=note('eh:shared','Same text',1);
  const arriving=note('eh:shared','Same text',2);
  assert.throws(()=>receiveBackpack(local, arriving), /Conflicting annotation/);
});

test('nonempty device refuses a different visitor label', () => {
  const local=note('eh:local','A');
  const arriving=putNote(newBackpack('visitor:other'),'eh:other',1,'B');
  assert.throws(()=>receiveBackpack(local,arriving), /Different visitor labels/);
});

test('empty device may restore the carried label and its notes', () => {
  const arriving=putNote(newBackpack('visitor:other'),'eh:other',1,'B');
  assert.deepEqual(receiveBackpack(newBackpack(owner),arriving),arriving);
});

test('capacity overflow refuses the whole arrival, leaving both inputs unchanged', () => {
  let local=newBackpack(owner);
  for(let i=0;i<100;i++) local=putNote(local,`eh:doc:${i}`,1,`Local ${i}`);
  const arriving=note('eh:one-more','Another');
  const localBefore=structuredClone(local), arrivingBefore=structuredClone(arriving);
  assert.throws(()=>receiveBackpack(local,arriving), /Invalid backpack/);
  assert.deepEqual(local,localBefore);
  assert.deepEqual(arriving,arrivingBefore);
});

test('invalid arriving data is refused even on an empty device', () => {
  assert.throws(()=>receiveBackpack(newBackpack(owner), '{broken'), SyntaxError);
});
