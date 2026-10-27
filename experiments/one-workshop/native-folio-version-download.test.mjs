// Regression for per-version folio downloads, using the committed browser handler.
// Simulated DOM/storage only; NOT a real browser-download or atomic concurrency test.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {emptyFolioHistory, parseFolioHistory, receiveFolioVersion,
  recoverFolioVersion, recoverLatestFolio, exportFolioHistory,
  restoreFolioHistoryIntoEmpty} from './native-folio-history.mjs';

const html=readFileSync(new URL('./native-folio-history-walk.html',import.meta.url),'utf8');
const inline=html.slice(html.indexOf('const KEY='),html.lastIndexOf('</script>'));
assert.ok(inline.startsWith('const KEY='),'Expected native history browser module');
const native=note=>JSON.stringify({v:1,source:'public-lands-return-3-face-111',
  format:'Earthly Hands / Public Lands / folio v1',
  workingReadingEdition:'fictional-test',note,occurrences:[],marks:[]});
const one=exportFolioHistory(receiveFolioVersion(emptyFolioHistory(),native('first')));
const two=exportFolioHistory(receiveFolioVersion(parseFolioHistory(one),native('second')));
const ids=['folio-file','journal-file','add','restore','folio-selection','journal-selection',
  'held','status','versions','take','export','rescue','release'];

function page(initial) {
  let stored=initial,consent=false,confirms=0;
  const names=[],bodies=[];
  function el(tag) {return {tag,disabled:false,hidden:false,value:'',textContent:'',
    children:[],handlers:{},addEventListener(k,fn){this.handlers[k]=fn;},
    append(...x){this.children.push(...x);},appendChild(x){this.children.push(x);},
    replaceChildren(...x){this.children=[...x];},
    click(){if(tag==='a')names.push(this.download);},remove(){}};}
  const elements=Object.fromEntries(ids.map(id=>[id,el(id)]));
  const document={getElementById:id=>elements[id],createElement:el,body:el('body')};
  const localStorage={getItem:()=>stored,setItem:(_k,v)=>{stored=v;},removeItem:()=>{stored=null;}};
  const URL={createObjectURL(blob){bodies.push(blob.parts.join(''));return 'blob:test';},
    revokeObjectURL(){}};
  class BlobMock{constructor(parts){this.parts=parts;}}
  // This suite tests download handlers; storage-event behavior has separate coverage.
  const window={addEventListener(){}};
  runInNewContext(inline,{document,window,localStorage,URL,Blob:BlobMock,setTimeout(){},
    confirm(){confirms++;return consent;},exportUnrecognizedStoredString(){return '';},
    emptyFolioHistory,parseFolioHistory,receiveFolioVersion,recoverFolioVersion,
    recoverLatestFolio,exportFolioHistory,restoreFolioHistoryIntoEmpty});
  return {elements,names,bodies,change(v){stored=v;},allow(){consent=true;},
    get confirmations(){return confirms;},get stored(){return stored;},
    version(i=0){elements.versions.children[i].children[1].handlers.click();}};
}

test('stale version download needs consent and never changes newer storage',()=>{
  const p=page(one);p.change(two);p.version();
  assert.equal(p.confirmations,1);assert.equal(p.bodies.length,0);
  assert.equal(p.stored,two);
});
test('consented stale version is labeled; verified version needs no consent',()=>{
  const stale=page(one);stale.change(two);stale.allow();stale.version();
  assert.deepEqual(stale.names,['public-lands-face-111-version-1-earlier-or-unverified-copy.json']);
  assert.equal(JSON.parse(stale.bodies[0]).note,'first');
  const clean=page(two);clean.version();
  assert.equal(clean.confirmations,0);
  assert.deepEqual(clean.names,['public-lands-face-111-version-1.json']);
});
test('previously observed release conflict remains visible after reversion',()=>{
  const p=page(one);p.change(two);p.allow();p.elements.release.handlers.click();
  p.change(one);p.version();
  assert.equal(p.confirmations,2);
  assert.deepEqual(p.names,['public-lands-face-111-version-1-earlier-or-unverified-copy.json']);
});
