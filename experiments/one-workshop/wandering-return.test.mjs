import test from 'node:test';
import assert from 'node:assert/strict';
import {beginWander,noteWander,emptyShared,returnSelected,addSharedChange,readShared,historyFor} from './wandering-return.mjs';
const entry=(id,words,basisAccess='workshop',basisKind='original')=>({
  entryId:id,kind:'speculation',words,basisKind,basisId:basisKind==='source'?'fictional-jacket':'original-sketch',basisAccess
});
function exploratoryHand() {
  let w=beginWander('forest-detour','glean');
  w=noteWander(w,entry('one','A staircase that is also a creek.'));
  w=noteWander(w,entry('two','The office might be a cloud.'));
  w=noteWander(w,entry('three','A secretly kept sketch.','private'));
  return w;
}
const change=(kind,itemId,extra)=>({eventId:kind + '-' + itemId,kind,by:'another-reader',itemId,...extra});

test('wandering leaves the shared ground untouched until a deliberate return',()=>{
  const shared=emptyShared(),w=exploratoryHand();
  assert.equal(w.entries.length,3);
  assert.equal(shared.events.length,0);
  assert.deepEqual(readShared(shared,'workshop'),[]);
  assert.deepEqual(readShared(shared,'public'),[]);
});

test('selective return keeps the unchosen, including private work, out of shared metadata',()=>{
  const w=exploratoryHand(),shared=emptyShared();
  const next=returnSelected(shared,w,['one'],0);
  assert.equal(next.generation,1);
  assert.equal(shared.generation,0);
  assert.equal(w.entries.length,3);
  assert.deepEqual(readShared(next,'public'),[]);
  const view=readShared(next,'workshop');
  assert.equal(view.length,1);
  assert.equal(view[0].words,'A staircase that is also a creek.');
  assert.equal(view[0].standing,'proposed');
  assert.equal(view[0].attributedHand,'glean');
  assert.equal(view[0].basisKind,'original'); // no invented claim of documentary authority
  assert.ok(!JSON.stringify(next).includes('cloud'));
  assert.ok(!JSON.stringify(next).includes('secretly'));
  assert.ok(!JSON.stringify(next).includes('forest-detour:two'));
});

test('private source cannot be shared and a failed batch is all-or-nothing',()=>{
  const w=exploratoryHand(),shared=emptyShared();
  assert.throws(()=>returnSelected(shared,w,['one','three'],0),/Private basis/);
  assert.equal(shared.generation,0);
  assert.deepEqual(readShared(shared,'workshop'),[]);
});

test('another hand can bring unrelated work home without overwriting first contribution',()=>{
  const a=exploratoryHand();
  const b=noteWander(beginWander('different-route','ravel'),entry('new','A second reading of the invented source.'));
  let shared=returnSelected(emptyShared(),a,['one'],0);
  shared=returnSelected(shared,b,['new'],shared.generation);
  assert.deepEqual(readShared(shared,'workshop').map(x=>x.itemId),['different-route:new','forest-detour:one']);
  assert.equal(shared.events.length,2);
  assert.throws(()=>returnSelected(shared,a,['one'],shared.generation),/Invalid selective return|Duplicate shared event/);
});

test('a stale return is refused rather than clobbering a neighbor',()=>{
  const a=exploratoryHand(),b=noteWander(beginWander('other-route','pen'),entry('a','Another odd idea.'));
  const shared=returnSelected(emptyShared(),a,['one'],0);
  assert.throws(()=>returnSelected(shared,b,['a'],0),/Stale shared generation/);
  assert.equal(readShared(shared,'workshop').length,1);
  // A caller must review the new ground before trying again.
  const next=returnSelected(shared,b,['a'],shared.generation);
  assert.equal(readShared(next,'workshop').length,2);
});

test('changed direction survives as revised history, then withdrawal, not deletion',()=>{
  let shared=returnSelected(emptyShared(),exploratoryHand(),['one'],0);
  const original=JSON.stringify(shared.events[0]);
  shared=addSharedChange(shared,change('revise','forest-detour:one',{
    words:'The staircase is a metaphor, not a surveyed creek.',
    reason:'A later reading corrects the mistaken map impression.',
    basisKind:'source',basisId:'revised-fictional-jacket',basisAccess:'workshop'}),shared.generation);
  assert.equal(readShared(shared,'workshop')[0].words,'The staircase is a metaphor, not a surveyed creek.');
  assert.equal(readShared(shared,'workshop')[0].basisKind,'source');
  assert.equal(readShared(shared,'workshop')[0].lastActBy,'another-reader');
  shared=addSharedChange(shared,change('withdraw','forest-detour:one',{
    reason:'Another source changes the interpretation.',
    notice:'This proposed reading was withdrawn; earlier attribution remains retrievable.'}),shared.generation);
  assert.deepEqual(readShared(shared,'public'),[]);
  assert.equal(readShared(shared,'workshop')[0].standing,'withdrawn');
  assert.ok(!JSON.stringify(readShared(shared,'workshop')).includes('Another source changes'));
  assert.equal(historyFor(shared,'forest-detour:one').length,3);
  assert.equal(JSON.stringify(historyFor(shared,'forest-detour:one')[0]),original);
});

test('unearned publication and private revision paths fail closed',()=>{
  let shared=returnSelected(emptyShared(),exploratoryHand(),['one'],0);
  assert.throws(()=>addSharedChange(shared,change('revise','forest-detour:one',{
    words:'Restricted notes',reason:'Not a public basis',basisKind:'source',basisId:'private-doc',basisAccess:'private'}),1),/restricted source|Cannot revise/);
  assert.throws(()=>readShared(shared,'private'),/Invalid audience/);
  const before=JSON.stringify(shared);
  assert.throws(()=>addSharedChange(shared,change('publish','forest-detour:one',{}),1),/Unknown shared event/);
  assert.equal(JSON.stringify(shared),before);
});

test('a cold JSON return reconstructs selected history without recovering unchosen private ideas',()=>{
  const source=exploratoryHand();
  let shared=returnSelected(emptyShared(),source,['two'],0);
  const restored=JSON.parse(JSON.stringify(shared));
  assert.deepEqual(readShared(restored,'workshop'),readShared(shared,'workshop'));
  assert.equal(historyFor(restored,'forest-detour:two').length,1);
  assert.equal(restored.events.length,1);
  assert.ok(!JSON.stringify(restored).includes('secretly'));
});
