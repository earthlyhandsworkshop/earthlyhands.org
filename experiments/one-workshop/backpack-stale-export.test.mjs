// Runs the actual backpack export handler against mocked DOM and localStorage.
// This is not a browser download, atomic concurrency, or deployed-system test.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {
  newBackpack, parseBackpack, receiveBackpack, putNote, removeNote,
  exportBackpack, MAX_BACKPACK_IMPORT_BYTES
} from './backpack.mjs';

const documentId='eh:public-lands:no3:p111';
const html=readFileSync(new URL('./backpack-walk.html',import.meta.url),'utf8');
const inline=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
assert.ok(inline,'the export page must expose its handler');
const script=inline.replace(/^import [^\n]+\n/gm,'');

function saved(note) {
  return putNote(newBackpack('visitor:test'),documentId,1,note);
}
function openPage(initial) {
  let stored=initial ? exportBackpack(initial) : null;
  let failRead=false, consent=false, confirmationCount=0, writes=0;
  const downloads=[],names=[];
  const elements=Object.fromEntries(
    ['note','status','save','clear','export','import','rescue','rescue-row']
      .map(id=>[id,{value:'',textContent:'',disabled:false,hidden:true}])
  );
  const document={
    querySelector(selector) {
      const element=elements[selector.slice(1)];
      assert.ok(element,'Unexpected element '+selector);
      return element;
    },
    createElement(tag) {
      assert.equal(tag,'a');
      return {href:'',download:'',click(){names.push(this.download);}};
    }
  };
  const localStorage={
    getItem() {if(failRead)throw Error('Storage read refused');return stored;},
    setItem(_key,value) {writes++;stored=value;}
  };
  const URL={
    createObjectURL(blob) {downloads.push(blob.parts.join(''));return 'blob:test';},
    revokeObjectURL() {}
  };
  class BlobMock {constructor(parts){this.parts=parts;}}
  runInNewContext(script,{
    document,localStorage,URL,Blob:BlobMock,setTimeout(){},
    confirm() {confirmationCount++;return consent;},
    exportUnrecognizedStoredString(){return '';},
    newBackpack,parseBackpack,receiveBackpack,putNote,removeNote,
    exportBackpack,MAX_BACKPACK_IMPORT_BYTES
  });
  return {
    elements,downloads,names,
    externalChange(value){stored=value;},
    failStorageReads(){failRead=true;},
    allowEarlierExport(){consent=true;},
    get stored(){return stored;},
    get writes(){return writes;},
    get confirmations(){return confirmationCount;}
  };
}

test('changed storage refuses an unapproved stale export without altering storage',()=>{
  const page=openPage(saved('First tab'));
  const newer=exportBackpack(saved('Second tab'));
  page.externalChange(newer);
  page.elements.export.onclick();
  assert.equal(page.confirmations,1);
  assert.equal(page.downloads.length,0);
  assert.equal(page.stored,newer);
  assert.equal(page.writes,0);
  assert.match(page.elements.status.textContent,/Export canceled/);
});

test('visitor may deliberately rescue an earlier copy under an explicit filename',()=>{
  const page=openPage(saved('First tab'));
  const newer=exportBackpack(saved('Second tab'));
  page.externalChange(newer);
  page.allowEarlierExport();
  page.elements.export.onclick();
  assert.equal(page.confirmations,1);
  assert.deepEqual(page.names,['earthly-hands-backpack-earlier-or-unverified-copy.json']);
  assert.equal(parseBackpack(page.downloads[0]).entries[0].note,'First tab');
  assert.equal(page.stored,newer);
});

test('a clean export retains the ordinary name and never asks for confirmation',()=>{
  const page=openPage(saved('Current'));
  page.elements.export.onclick();
  assert.equal(page.confirmations,0);
  assert.deepEqual(page.names,['earthly-hands-backpack.json']);
  assert.equal(parseBackpack(page.downloads[0]).entries[0].note,'Current');
});

test('unsaved words block stale export before consent is requested',()=>{
  const page=openPage(saved('Saved'));
  page.externalChange(exportBackpack(saved('Newer')));
  page.elements.note.value='Not saved anywhere';
  page.allowEarlierExport();
  page.elements.export.onclick();
  assert.equal(page.downloads.length,0);
  assert.equal(page.confirmations,0);
  assert.equal(page.elements.note.value,'Not saved anywhere');
  assert.match(page.elements.status.textContent,/Unsaved writing/);
});

test('unreadable storage can be rescued only as an unverified copy',()=>{
  const page=openPage(saved('Saved'));
  page.failStorageReads();
  page.allowEarlierExport();
  page.elements.export.onclick();
  assert.deepEqual(page.names,['earthly-hands-backpack-earlier-or-unverified-copy.json']);
  assert.equal(page.confirmations,1);
});

test('once a conflict is detected it remains disclosed even if stored bytes later match',()=>{
  const page=openPage(saved('Old'));
  const original=page.stored;
  page.externalChange(exportBackpack(saved('New')));
  page.elements.save.onclick();
  assert.match(page.elements.status.textContent,/Save refused: Another tab changed/);
  page.externalChange(original);
  page.allowEarlierExport();
  page.elements.export.onclick();
  assert.deepEqual(page.names,['earthly-hands-backpack-earlier-or-unverified-copy.json']);
  assert.equal(page.confirmations,1);
});
