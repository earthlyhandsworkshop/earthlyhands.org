// Local receipt sequence for repeatedly importing a Face 111 visitor folio.
// Keeps EVERY earlier native JSON file unchanged; no source-edition adjudication.
// No timestamps or author claims: ordering is only order received by this pocket.
// This is a pure model, NOT browser persistence, identity, or synchronization.
import {carryNativeFolio, checkNativeFolioPocket, recoverNativeFolio, PL111_SOURCE} from './native-folio-pocket.mjs';

export const FOLIO_HISTORY_SCHEMA = 'earthlyhands.native-folio-history.v0';
export const FOLIO_HISTORY_LIMIT = 12;
const MAX_HISTORY_BYTES = 3_000_000;
const bytes = text => new TextEncoder().encode(text).length;

export function emptyFolioHistory() {
  return {schema:FOLIO_HISTORY_SCHEMA, source:PL111_SOURCE, receipts:[]};
}

export function parseFolioHistory(value) {
  if (typeof value === 'string' && bytes(value) > MAX_HISTORY_BYTES) throw Error('Folio history too large');
  const x = typeof value === 'string' ? JSON.parse(value) : value;
  if (!x || typeof x !== 'object' || Array.isArray(x) ||
      x.schema !== FOLIO_HISTORY_SCHEMA || x.source !== PL111_SOURCE ||
      !Array.isArray(x.receipts) || x.receipts.length > FOLIO_HISTORY_LIMIT) {
    throw Error('Invalid folio history');
  }
  const receipts=x.receipts.map(checkNativeFolioPocket);
  const result={schema:FOLIO_HISTORY_SCHEMA,source:PL111_SOURCE,receipts};
  if (bytes(JSON.stringify(result)) > MAX_HISTORY_BYTES) throw Error('Folio history too large');
  return result;
}

// An older single-pocket browser record remains recoverable without rewriting
// its original bytes or pretending this journal knows when they were made.
export function historyFromLegacyPocket(legacyPocket) {
  return parseFolioHistory({...emptyFolioHistory(), receipts:[checkNativeFolioPocket(legacyPocket)]});
}

export function receiveFolioVersion(history, nativeJson) {
  const previous=parseFolioHistory(history);
  const next=carryNativeFolio(nativeJson);
  if (previous.receipts.at(-1)?.raw_json === next.raw_json) return previous;
  if (previous.receipts.length >= FOLIO_HISTORY_LIMIT) {
    throw Error('Folio history is full; export it before clearing or starting a new one');
  }
  // Full candidate validation happens before the caller replaces its current
  // state; failed imports must never discard the already-received versions.
  return parseFolioHistory({...previous, receipts:[...previous.receipts, next]});
}

export function recoverFolioVersion(history, index) {
  const current=parseFolioHistory(history);
  if (!Number.isSafeInteger(index) || index < 0 || index >= current.receipts.length) {
    throw Error('Unknown folio receipt');
  }
  return recoverNativeFolio(current.receipts[index]);
}

export function recoverLatestFolio(history) {
  const current=parseFolioHistory(history);
  return current.receipts.length ? recoverNativeFolio(current.receipts.at(-1)) : null;
}

export function exportFolioHistory(history) {
  return JSON.stringify(parseFolioHistory(history),null,2)+'\n';
}

// A portable history may only be restored into an EMPTY local pocket. It must
// never silently overwrite another visitor's existing browser receipts.
export function restoreFolioHistoryIntoEmpty(destination, exportedHistory) {
  const current=parseFolioHistory(destination);
  if (current.receipts.length) throw Error('Restore refused: destination already has folio history');
  return parseFolioHistory(exportedHistory);
}
