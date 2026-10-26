// Executes the branch's native folio-history download handlers under a mocked DOM.
// These tests do NOT establish actual browser downloads or atomic multi-tab protection.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {
  emptyFolioHistory,parseFolioHistory,receiveFolioVersion,recoverFolioVersion,
  recoverLatestFolio,exportFolioHistory,restoreFolioHistoryIntoEmpty
} from './native-folio-history.mjs';

const html=readFileSync(new URL('./native-folio-history-walk.html',import.meta.url),'utf8');
const inline=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
assert.ok(inline,'Expected inline native-folio-history script');
const script=inline
  .replace(/import\s+\{[\s\S]*?\}\s+from\s+'\.\/native-folio-history\.mjs';/,'')
  .replace(/import\s+\{exportUnrecognizedStoredString\}\s+from\s+'\.\/unrecognized-storage-rescue\.mjs';/,'');
const native=note=>JSON.stringify({
  v:1,source:'public-lands-return-3-face-111',
  format:'Earthly Hands / Public Lands / folio v1',
  workingReadingEdition:'fictional-test',note,occurrences:[],marks:[]
});
const first=receiveFolioVersion(emptyFolioHistory(),native('first'));
const second=receiveFolioVersion(first,native('second'));
const one=exportFolioHistory(first),two=exportFolioHistory(second);
const ids=['folio-file','journal-file','add','restore','folio-selection',
  'journal-selection','held','status','versions','take','export','rescue','release'];

function openPage(initial) {
  let stored=initial,accept=false,unreadable=false,refuseWrites=false,confirmations=0,writes=0;
  const names=[],bodies=[];
  function element(tag){
    return {
      tag,disabled:false,hidden:false,value:'',textContent:'',children:[],
      handlers:{},
      addEventListener(name,fn){this.handlers[name]=fn;},
      appendChild(child){this.children.push(child);},
      append(...children){this.children.push(...children);},
      replaceChildren(...children){this.children=[...children];},
      click(){if(tag==='a')names.push(this.download);},
      remove(){}
    };
  }
  const elements=Object.fromEntries(ids.map(id=>[id,element(id)]));
  const document={
    getElementById(id){assert.ok(elements[id]);return elements[id];},
    createElement(tag){return element(tag);},
    body:element('body')
  };
  const localStorage={
    getItem(){if(unreadable)throw Error('Storage read unavailable');return stored;},
    setItem(_key,value){writes++;if(refuseWrites)throw Error('Storage full');stored=value;},
    removeItem(){stored=null;}
  };
  const URL={
    createObjectURL(blob){bodies.push(blob.parts.join(''));return 'blob:fake';},
    revokeObjectURL(){}
  };
  class BlobMock {constructor(parts){this.parts=parts;}}
  runInNewContext(script,{
    document,localStorage,URL,Blob:BlobMock,setTimeout(){},
    confirm(){confirmations++;return accept;},
    exportUnrecognizedStoredString(){return '';},
    emptyFolioHistory,parseFolioHistory,receiveFolioVersion,recoverFolioVersion,
    recoverLatestFolio,exportFolioHistory,restoreFolioHistoryIntoEmpty
  });
  return {
    elements,names,bodies,
    changeStored(value){stored=value;},
    allowDownload(){accept=true;},
    preventRead(){unreadable=true;},
    preventWrite(){refuseWrites=true;},
    get stored(){return stored;},
    get confirmations(){return confirmations;},
    get writes(){return writes;},
    async importNative(text){
      elements['folio-file'].files=[{name:'fictional.json',size:text.length,text:async()=>text}];
      elements['folio-file'].handlers.change();
      await elements.add.handlers.click();
    }
  };
}

test('stale journal refused without consent; other tab storage unchanged',()=>{
  const p=openPage(one);p.changeStored(two);p.elements.export.handlers.click();
  assert.equal(p.confirmations,1);assert.equal(p.bodies.length,0);
  assert.equal(p.stored,two);assert.match(p.elements.status.textContent,/CANCELED/);
});
test('consented older journal gets unmistakably qualified filename',()=>{
  const p=openPage(one);p.changeStored(two);p.allowDownload();p.elements.export.handlers.click();
  assert.deepEqual(p.names,['public-lands-face-111-journal-earlier-or-unverified-copy.json']);
  assert.equal(parseFolioHistory(p.bodies[0]).receipts.length,1);
  assert.equal(parseFolioHistory(p.stored).receipts.length,2);
});
test('clean journal export retains normal filename',()=>{
  const p=openPage(one);p.elements.export.handlers.click();
  assert.equal(p.confirmations,0);
  assert.deepEqual(p.names,['public-lands-face-111-journal.json']);
});
test('latest-source download also refuses silent stale copy',()=>{
  const p=openPage(one);p.changeStored(two);p.elements.take.handlers.click();
  assert.equal(p.confirmations,1);assert.equal(p.bodies.length,0);
});
test('consented stale source copy is labeled and preserves its exact notes',()=>{
  const p=openPage(one);p.changeStored(two);p.allowDownload();p.elements.take.handlers.click();
  assert.deepEqual(p.names,['public-lands-face-111-return-folio-earlier-or-unverified-copy.json']);
  assert.equal(JSON.parse(p.bodies[0]).note,'first');
});
test('unreadable storage requires consent',()=>{
  const p=openPage(one);p.preventRead();p.elements.export.handlers.click();
  assert.equal(p.confirmations,1);assert.equal(p.bodies.length,0);
});
test('tab-only import after storage refusal cannot export as verified',async()=>{
  const p=openPage(null);p.preventWrite();await p.importNative(native('only in tab'));
  p.elements.export.handlers.click();
  assert.equal(p.confirmations,1);assert.equal(p.bodies.length,0);assert.equal(p.stored,null);
});
test('observed conflict remains disclosed if storage later reverts',async()=>{
  const p=openPage(one);p.changeStored(two);
  await p.importNative(native('attempted revision'));
  assert.match(p.elements.status.textContent,/IMPORT REFUSED/);
  p.changeStored(one);p.elements.export.handlers.click();
  assert.equal(p.confirmations,1);assert.equal(p.bodies.length,0);
});

test('failed release keeps the observed storage conflict visible after reversion',()=>{
  const p=openPage(one);p.changeStored(two);p.allowDownload();
  p.elements.release.handlers.click();
  assert.match(p.elements.status.textContent,/RELEASE NOT CONFIRMED/);
  assert.equal(p.stored,two);
  p.changeStored(one);p.elements.export.handlers.click();
  assert.equal(p.confirmations,2); // release consent AND later stale-export consent
  assert.deepEqual(p.names,['public-lands-face-111-journal-earlier-or-unverified-copy.json']);
  assert.equal(parseFolioHistory(p.bodies[0]).receipts.length,1);
});

test('later reversion cannot authorize a journal write after an observed conflict',async()=>{
  const p=openPage(one);p.changeStored(two);
  await p.importNative(native('first refused import'));
  assert.match(p.elements.status.textContent,/IMPORT REFUSED/);
  assert.equal(p.stored,two);
  p.changeStored(one);
  await p.importNative(native('second refused import'));
  assert.match(p.elements.status.textContent,/IMPORT REFUSED.*earlier tab conflict/);
  assert.equal(p.stored,one);
  assert.equal(p.writes,0);
});

test('a failed release remains forbidden after intervening storage reverts',()=>{
  const p=openPage(one);p.changeStored(two);p.allowDownload();
  p.elements.release.handlers.click();
  assert.match(p.elements.status.textContent,/RELEASE NOT CONFIRMED/);
  assert.equal(p.stored,two);
  p.changeStored(one);
  p.elements.release.handlers.click();
  assert.match(p.elements.status.textContent,/RELEASE NOT CONFIRMED.*earlier tab conflict/);
  assert.equal(p.stored,one);
});
