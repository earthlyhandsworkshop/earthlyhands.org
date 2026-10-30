// Independent fictional source-assertion receipt grammar, opt-in v2 specimen.
// NOT real authentication, signed provenance, permissions, durable transactions,
// a v1 migration, or an archival/source-object transfer.
import { createHash } from 'node:crypto';
import { id, accessKey, validateItem } from './bench-sqlite-core.mjs';

export const SOURCE_ASSERTIONS_V2_SCHEMA = 'earthlyhands.workbench.source-assertions.v2-fixture';
const HEX = /^[0-9a-f]{64}$/;
const SNAPSHOT_KEYS = ['schema','benchId','access','generation','tipDigest','receipts','current'];
const RECEIPT_KEYS = ['seq','eventId','kind','actor','itemId','assertionId',
  'priorAssertionId','priorDigest','basisPointer','sourceId','warningIds',
  'access','claimDigest','tipDigest'];
const INPUT_KEYS = ['eventId','kind','actor','itemId','assertionId',
  'priorAssertionId','basisPointer','sourceId','warningIds','access'];
const CURRENT_KEYS = ['itemId','assertionId','sourceId','warningIds','access','claimDigest'];

function shape(x, keys, label) {
  if (!x || typeof x !== 'object' || Array.isArray(x) ||
      Object.keys(x).length !== keys.length ||
      keys.some(key => !Object.hasOwn(x,key)))
    throw new Error('Invalid ' + label + ' fields');
}
function requireId(x,label) {
  if (!id(x)) throw new Error('Invalid ' + label);
}
function clone(x) { return JSON.parse(JSON.stringify(x)); }
function digest(parts) {
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex');
}
function genesis(benchId,access) {
  return digest([SOURCE_ASSERTIONS_V2_SCHEMA,'genesis',benchId,accessKey(access)]);
}
function claimDigest(x) {
  return digest([SOURCE_ASSERTIONS_V2_SCHEMA,'claim',x.itemId,x.assertionId,
    x.sourceId,x.warningIds,accessKey(x.access)]);
}
function receiptDigest(previous,r) {
  return digest([SOURCE_ASSERTIONS_V2_SCHEMA,'receipt',previous,
    r.seq,r.eventId,r.kind,r.actor,r.itemId,r.assertionId,r.priorAssertionId,
    r.priorDigest,r.basisPointer,r.sourceId,r.warningIds,accessKey(r.access),r.claimDigest]);
}
function validateClaim(r,benchAccess) {
  requireId(r.itemId,'item ID');
  requireId(r.assertionId,'assertion ID');
  validateItem({itemId:r.itemId,sourceId:r.sourceId,
    warningIds:r.warningIds,access:r.access},benchAccess);
  if (!HEX.test(r.claimDigest) || r.claimDigest !== claimDigest(r))
    throw new Error('Source assertion digest mismatch');
}
function rowOf(r) {
  return {itemId:r.itemId,assertionId:r.assertionId,sourceId:r.sourceId,
    warningIds:clone(r.warningIds),access:clone(r.access),claimDigest:r.claimDigest};
}

// Replay is an INTERNAL-consistency test of claimed facts, not proof those facts
// were once true. A coherent forger can rewrite an unanchored complete ledger.
export function auditSourceAssertionsV2(value) {
  const s=typeof value === 'string' ? JSON.parse(value) : value;
  shape(s,SNAPSHOT_KEYS,'source-assertion snapshot');
  if (s.schema !== SOURCE_ASSERTIONS_V2_SCHEMA) throw new Error('Unsupported source-assertion schema');
  requireId(s.benchId,'bench ID');
  accessKey(s.access);
  if (!Array.isArray(s.receipts) || !Array.isArray(s.current) ||
      s.receipts.length > 100000 ||
      !Number.isSafeInteger(s.generation) || s.generation !== s.receipts.length)
    throw new Error('Source assertion generation mismatch');
  const itemCurrent=new Map(), eventIds=new Set(), assertionIds=new Set();
  let tip=genesis(s.benchId,s.access);
  for (let index=0;index<s.receipts.length;index++) {
    const r=s.receipts[index];
    shape(r,RECEIPT_KEYS,'source-assertion receipt');
    if (r.seq !== index+1 || !id(r.eventId) || !id(r.actor) ||
        eventIds.has(r.eventId) || assertionIds.has(r.assertionId))
      throw new Error('Source assertion identity or sequence mismatch');
    if (r.kind !== 'arrive' && r.kind !== 'correct')
      throw new Error('Unknown source assertion act');
    validateClaim(r,s.access);
    eventIds.add(r.eventId);
    assertionIds.add(r.assertionId);
    const previous=itemCurrent.get(r.itemId);
    if (r.kind === 'arrive') {
      if (previous || r.priorAssertionId !== null || r.priorDigest !== null ||
          r.basisPointer !== null)
        throw new Error('Invalid source assertion arrival');
    } else {
      if (!previous || r.priorAssertionId !== previous.assertionId ||
          r.priorDigest !== previous.claimDigest || !id(r.basisPointer))
        throw new Error('Source assertion predecessor or basis mismatch');
    }
    const next=receiptDigest(tip,r);
    if (!HEX.test(r.tipDigest) || r.tipDigest !== next)
      throw new Error('Source assertion receipt-chain mismatch');
    tip=next;
    itemCurrent.set(r.itemId,rowOf(r));
  }
  if (!HEX.test(s.tipDigest) || s.tipDigest !== tip)
    throw new Error('Source assertion tip mismatch');
  const expected=[...itemCurrent.values()];
  if (s.current.length !== expected.length)
    throw new Error('Source assertion materialization mismatch');
  for (let i=0;i<expected.length;i++) {
    const observed=s.current[i], wanted=expected[i];
    shape(observed,CURRENT_KEYS,'source-assertion current row');
    validateClaim(observed,s.access);
    if (observed.itemId !== wanted.itemId ||
        observed.assertionId !== wanted.assertionId ||
        observed.sourceId !== wanted.sourceId ||
        JSON.stringify(observed.warningIds) !== JSON.stringify(wanted.warningIds) ||
        accessKey(observed.access) !== accessKey(wanted.access) ||
        observed.claimDigest !== wanted.claimDigest)
      throw new Error('Source assertion materialization mismatch');
  }
  return {generation:s.generation,tipDigest:tip,current:clone(expected)};
}

export function createSourceAssertionsV2(benchId,access) {
  requireId(benchId,'bench ID');
  accessKey(access);
  const s={schema:SOURCE_ASSERTIONS_V2_SCHEMA,benchId,access:clone(access),
    generation:0,tipDigest:genesis(benchId,access),receipts:[],current:[]};
  auditSourceAssertionsV2(s);
  return s;
}

// Pure specimen update. expectedGeneration is an in-memory check only;
// it is NOT database compare-and-swap across processes.
export function appendSourceAssertionV2(ledger,input,expectedGeneration) {
  const old=auditSourceAssertionsV2(ledger);
  if (!Number.isSafeInteger(expectedGeneration) ||
      expectedGeneration !== old.generation)
    throw new Error('Stale source assertion generation');
  shape(input,INPUT_KEYS,'new source assertion');
  if (!id(input.eventId) || !id(input.actor)) throw new Error('Invalid source assertion actor or event');
  validateItem({itemId:input.itemId,sourceId:input.sourceId,
    warningIds:input.warningIds,access:input.access},ledger.access);
  requireId(input.assertionId,'assertion ID');
  if (input.kind !== 'arrive' && input.kind !== 'correct')
    throw new Error('Unknown source assertion act');
  const previous=old.current.find(x=>x.itemId===input.itemId);
  if (input.kind === 'arrive' &&
      (previous || input.priorAssertionId !== null || input.basisPointer !== null))
    throw new Error('Invalid source assertion arrival');
  if (input.kind === 'correct' &&
      (!previous || input.priorAssertionId !== previous.assertionId ||
       !id(input.basisPointer)))
    throw new Error('Source assertion predecessor or basis mismatch');
  const raw=clone(input);
  const receipt={seq:old.generation+1,eventId:raw.eventId,kind:raw.kind,
    actor:raw.actor,itemId:raw.itemId,assertionId:raw.assertionId,
    priorAssertionId:raw.priorAssertionId,
    priorDigest:previous?.claimDigest ?? null,basisPointer:raw.basisPointer,
    sourceId:raw.sourceId,warningIds:raw.warningIds,access:raw.access,
    claimDigest:claimDigest(raw)};
  receipt.tipDigest=receiptDigest(old.tipDigest,receipt);
  const current=old.current;
  const row=rowOf(receipt);
  if (previous) current[current.findIndex(x=>x.itemId===row.itemId)]=row;
  else current.push(row);
  const next={schema:ledger.schema,benchId:ledger.benchId,access:clone(ledger.access),
    generation:old.generation+1,tipDigest:receipt.tipDigest,
    receipts:[...clone(ledger.receipts),receipt],current};
  auditSourceAssertionsV2(next);
  return next;
}

// This becomes useful only if the expected tip was retained separately and
// protected from the party editing the ledger. It is not a signature.
export function checkIndependentSourceTip(ledger,generation,expectedTip) {
  auditSourceAssertionsV2(ledger);
  if (!Number.isSafeInteger(generation) || generation < 0 ||
      generation > ledger.generation || !HEX.test(expectedTip))
    throw new Error('Invalid independent source-assertion anchor');
  const actual=generation === 0
    ? genesis(ledger.benchId,ledger.access) : ledger.receipts[generation-1].tipDigest;
  if (actual !== expectedTip) throw new Error('Independent source-assertion tip mismatch');
  return true;
}
