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
