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
  const names=[],bodies=[],listeners={};
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
  const window={addEventListener(type,handler){listeners[type]=handler;}};
  runInNewContext(script,{
    document,window,localStorage,URL,Blob:BlobMock,setTimeout(){},
    confirm(){confirmations++;return accept;},
    exportUnrecognizedStoredString(){return '';},
    emptyFolioHistory,parseFolioHistory,receiveFolioVersion,recoverFolioVersion,
    recoverLatestFolio,exportFolioHistory,restoreFolioHistoryIntoEmpty
  });
  return {
    elements,names,bodies,
    changeStored(value){stored=value;},
    // An actual storage event is delivered asynchronously in other browser contexts;
    // this mock dispatches that evidence explicitly.
    otherTabChanged(value){
      const prior=stored;stored=value;
      listeners.storage?.({storageArea:localStorage,key:'earthlyhands.one-workshop.native-folio-history.111.v0',oldValue:prior,newValue:value});
    },
    otherTabCleared(){
      stored=null;
      listeners.storage?.({storageArea:localStorage,key:null,oldValue:null,newValue:null});
    },
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
    },
    beginImportNative(text, readPromise){
      elements['folio-file'].files=[{name:'pending.json',size:text.length,text:()=>readPromise}];
      elements['folio-file'].handlers.change();
      return elements.add.handlers.click();
    }
  };
}

test('storage write refusal keeps a tab-only newer version out of destructive release',async()=>{
  const p=openPage(one);p.preventWrite();
  await p.importNative(native('not saved to browser storage'));
  assert.match(p.elements.status.textContent,/in this tab ONLY/);
  assert.equal(p.elements.release.disabled,true);
  assert.equal(p.stored,one); // The original saved history remains.
  p.allowDownload();
  // Guard the handler as well as the disabled button, against programmatic calls.
  p.elements.release.handlers.click();
  assert.match(p.elements.status.textContent,/RELEASE REFUSED.*not saved/);
  assert.equal(p.confirmations,0);
  assert.equal(p.stored,one);
  p.elements.export.handlers.click();
  assert.equal(p.confirmations,1);
  assert.deepEqual(p.names,['public-lands-face-111-journal-earlier-or-unverified-copy.json']);
  assert.equal(parseFolioHistory(p.bodies[0]).receipts.length,2);
});

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


test('observed cross-tab event remains a conflict after bytes return, even before any click',async()=>{
  const p=openPage(one);
  p.otherTabChanged(two);
  assert.match(p.elements.status.textContent,/ANOTHER TAB CHANGED THE JOURNAL/);
  assert.equal(p.elements.release.disabled,true);
  p.otherTabChanged(one); // The previously observed edit is not undone by a matching byte string.
  await p.importNative(native('not allowed to overwrite intervening history'));
  assert.match(p.elements.status.textContent,/IMPORT REFUSED.*earlier tab conflict/);
  assert.equal(p.stored,one);
  assert.equal(p.writes,0);
  p.allowDownload();p.elements.export.handlers.click();
  assert.deepEqual(p.names,['public-lands-face-111-journal-earlier-or-unverified-copy.json']);
});

test('storage clear of a held journal is an observed conflicting change',async()=>{
  const p=openPage(one);
  p.otherTabCleared();
  assert.match(p.elements.status.textContent,/ANOTHER TAB CHANGED THE JOURNAL/);
  await p.importNative(native('cannot silently restore deleted other-tab journal'));
  assert.match(p.elements.status.textContent,/IMPORT REFUSED.*earlier tab conflict/);
  assert.equal(p.stored,null);
  assert.equal(p.writes,0);
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

test('late same-tab import cannot resurrect a journal deliberately released during file read',async()=>{
  const p=openPage(one);
  let finish;
  const read=new Promise(resolve=>{finish=resolve;});
  const late=native('late import');
  const pending=p.beginImportNative(late,read);
  p.allowDownload();
  p.elements.release.handlers.click();
  assert.match(p.elements.status.textContent,/release confirmed/i);
  assert.equal(p.stored,null);
  finish(late);
  await pending;
  assert.match(p.elements.status.textContent,/IMPORT REFUSED.*Another local operation finished/);
  assert.equal(p.stored,null); // No import from before the deliberate release can restore old receipts.
  assert.equal(p.writes,0);
});

test('two overlapping file reads never silently replace the first completed import',async()=>{
  const p=openPage(one);
  let finishFirst,finishSecond;
  const firstIncoming=native('earlier read');
  const secondIncoming=native('later read');
  const readFirst=new Promise(resolve=>{finishFirst=resolve;});
  const readSecond=new Promise(resolve=>{finishSecond=resolve;});
  const pendingFirst=p.beginImportNative(firstIncoming,readFirst);
  const pendingSecond=p.beginImportNative(secondIncoming,readSecond);
  finishFirst(firstIncoming);
  await pendingFirst;
  assert.equal(parseFolioHistory(p.stored).receipts.length,2);
  finishSecond(secondIncoming);
  await pendingSecond;
  assert.match(p.elements.status.textContent,/IMPORT REFUSED.*Another local operation finished/);
  const stored=parseFolioHistory(p.stored);
  assert.equal(stored.receipts.length,2);
  assert.equal(stored.receipts[1].raw_json,firstIncoming); // The uncompleted second receipt was refused, not silently substituted.
  assert.equal(p.writes,1);
});
