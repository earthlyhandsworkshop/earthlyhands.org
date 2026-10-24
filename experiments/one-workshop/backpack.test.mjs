import test from 'node:test';
import assert from 'node:assert/strict';
import {newBackpack,putNote,removeNote,parseBackpack,exportBackpack} from './backpack.mjs';
test('private visitor annotation travels without altering common document',()=>{
  const source={id:'eh:test:0001',revision:2,content:'Common source remains unchanged'};
  const original=structuredClone(source);
  let b=putNote(newBackpack('visitor:test'),'eh:test:0001',2,'Look again at the ending');
  assert.deepEqual(source,original);
  assert.deepEqual(parseBackpack(exportBackpack(b)),b);
  b=putNote(b,'eh:test:0001',2,'New private reading');
  assert.equal(b.entries.length,1);
  assert.equal(b.entries[0].note,'New private reading');
  assert.deepEqual(removeNote(b,'eh:test:0001').entries,[]);
});
test('invalid or duplicate imported annotations refused',()=>{
  const b=putNote(newBackpack('visitor:test'),'eh:test:0001',1,'note');
  assert.throws(()=>parseBackpack({...b,entries:[...b.entries,...b.entries]}));
  assert.throws(()=>putNote(b,'bad / path',1,'no'));
  assert.throws(()=>putNote(b,'eh:test:0001',0,'no'));
});
