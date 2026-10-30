import test from 'node:test';
import assert from 'node:assert/strict';
import { carryNativeFolio } from './native-folio-pocket.mjs';
import { emptyFolioHistory, historyFromLegacyPocket, receiveFolioVersion,
  recoverFolioVersion, recoverLatestFolio, exportFolioHistory,
  restoreFolioHistoryIntoEmpty, parseFolioHistory, FOLIO_HISTORY_LIMIT
} from './native-folio-history.mjs';

function specimen(note) {
  return JSON.stringify({v:1,source:'public-lands-return-3-face-111',
    format:'Earthly Hands / Public Lands / folio v1',
    workingReadingEdition:'test-r4', note, occurrences:[], marks:[]})+'\n';
}

test('an edited import retains earlier original bytes', () => {
  const first=specimen('first'), second=specimen('second');
  const one=receiveFolioVersion(emptyFolioHistory(),first);
  const two=receiveFolioVersion(one,second);
  assert.equal(two.receipts.length,2);
  assert.equal(recoverFolioVersion(two,0),first);
  assert.equal(recoverLatestFolio(two),second);
  assert.equal(receiveFolioVersion(two,second).receipts.length,2);
  assert.deepEqual(parseFolioHistory(exportFolioHistory(two)),two);
});

test('legacy single pocket can be received unaltered', () => {
  const raw=specimen('legacy');
  const history=historyFromLegacyPocket(carryNativeFolio(raw));
  assert.equal(recoverLatestFolio(history),raw);
});

test('refused imports leave old receipts recoverable', () => {
  const first=specimen('held');
  const previous=receiveFolioVersion(emptyFolioHistory(),first);
  assert.throws(()=>receiveFolioVersion(previous,'{bad'));
  assert.equal(recoverLatestFolio(previous),first);
});

test('a full pocket does not drop its earliest version', () => {
  let history=emptyFolioHistory();
  for(let i=0;i<FOLIO_HISTORY_LIMIT;i++) {
    history=receiveFolioVersion(history,specimen(String(i)));
  }
  assert.throws(()=>receiveFolioVersion(history,specimen('overflow')),/full/);
  assert.equal(recoverFolioVersion(history,0),specimen('0'));
});

test('portable history imports only into empty history', () => {
  const saved=receiveFolioVersion(emptyFolioHistory(),specimen('private'));
  assert.deepEqual(restoreFolioHistoryIntoEmpty(emptyFolioHistory(),
    exportFolioHistory(saved)),saved);
  assert.throws(()=>restoreFolioHistoryIntoEmpty(saved,exportFolioHistory(saved)),
    /already has folio history/);
});

test('near-limit journal never accepts a receipt whose export cannot return', () => {
  // Each valid native folio fits the 300 KB per-file cap. Ten fit the
  // old compact journal size limit, but indentation makes its export too big.
  const largeFolio = index => JSON.stringify({
    v:1, source:'public-lands-return-3-face-111',
    format:'Earthly Hands / Public Lands / folio v1',
    workingReadingEdition:'edge-'+index,
    note:'x'.repeat(25),
    occurrences:Array(40).fill('x'.repeat(7485)),
    marks:[]
  })+'\n';

  let kept=emptyFolioHistory();
  for(let i=0;i<9;i++) kept=receiveFolioVersion(kept,largeFolio(i));
  const portable=exportFolioHistory(kept);
  assert.deepEqual(parseFolioHistory(portable),kept);

  assert.throws(()=>receiveFolioVersion(kept,largeFolio(9)),/too large/);
  assert.equal(exportFolioHistory(kept),portable);
});


test('unknown journal and receipt fields are refused intact, never silently stripped', () => {
  const kept=receiveFolioVersion(emptyFolioHistory(),specimen('earlier private writing'));
  const laterJournal={...kept,permissionHistory:[{status:'future-private-claim'}]};
  const journalBefore=structuredClone(laterJournal);
  assert.throws(()=>parseFolioHistory(laterJournal),/Invalid folio history/);
  assert.deepEqual(laterJournal,journalBefore);

  const laterPocket={...kept,receipts:[{...kept.receipts[0],
    chronologyClaim:'newer unrecognized receipt'}]};
  const pocketBefore=structuredClone(laterPocket);
  assert.throws(()=>parseFolioHistory(laterPocket),/Invalid native-folio pocket/);
  assert.deepEqual(laterPocket,pocketBefore);
});

test('unknown fields INSIDE a native source folio remain opaque and byte-identical', () => {
  const original=JSON.parse(specimen('a future-native field'));
  const raw=JSON.stringify({...original,futureNativeNote:{doNotInterpret:true}})+'\n';
  const saved=receiveFolioVersion(emptyFolioHistory(),raw);
  assert.equal(recoverFolioVersion(saved,0),raw);
  assert.deepEqual(parseFolioHistory(exportFolioHistory(saved)),saved);
});
