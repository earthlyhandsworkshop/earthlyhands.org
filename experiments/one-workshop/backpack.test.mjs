import test from 'node:test';
import assert from 'node:assert/strict';
import {newBackpack,putNote,removeNote,parseBackpack,exportBackpack,receiveBackpack} from './backpack.mjs';
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

test('unrecognized top-level history is refused, not silently stripped from a carried backpack',()=>{
  const b=putNote(newBackpack('visitor:test'),'eh:test:0001',2,'Keep this note');
  const fromLaterCarrier={...b,history:[{revision:1,body:'Earlier note'}]};
  const unchanged=structuredClone(fromLaterCarrier);
  assert.throws(()=>parseBackpack(fromLaterCarrier),/Unrecognized backpack fields/);
  assert.throws(()=>exportBackpack(fromLaterCarrier),/Unrecognized backpack fields/);
  assert.deepEqual(fromLaterCarrier,unchanged);
});

test('unrecognized annotation provenance is refused instead of disappearing on export',()=>{
  const b=putNote(newBackpack('visitor:test'),'eh:test:0001',2,'Keep this note');
  const fromLaterCarrier={...b,entries:[{...b.entries[0],
    source_jacket:'eh:source:receipt-27'}]};
  assert.throws(()=>parseBackpack(JSON.stringify(fromLaterCarrier)),/Unrecognized annotation fields/);
  assert.throws(()=>exportBackpack(fromLaterCarrier),/Unrecognized annotation fields/);
});

test('an empty device does not silently absorb a foreign extended backpack',()=>{
  const local=newBackpack('visitor:test');
  const incoming=putNote(newBackpack('visitor:other'),'eh:test:0002',1,'Arriving');
  incoming.entries[0].prior_version='Earlier carried wording';
  assert.throws(()=>receiveBackpack(local,JSON.stringify(incoming)),/Unrecognized annotation fields/);
  assert.deepEqual(local,newBackpack('visitor:test'));
});
