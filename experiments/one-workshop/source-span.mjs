// Source-span v0: one explicit, version-pinned passage from a fictional text body.
// This is a local integrity/locator experiment, not source authentication,
// authorization, rights verification, a searchable database, or public release.
import { createHash } from 'node:crypto';

export const SOURCE_SPAN_SCHEMA = 'earthlyhands.source-span.v0-fixture';
const HEX = /^[0-9a-f]{64}$/;
const RECORD_KEYS = ['schema','id','parent','span','source','reading','recordDigest'];
const PARENT_KEYS = ['fileId','revision','bodyDigest'];
const SPAN_KEYS = ['start','end','excerptDigest'];
const SOURCE_KEYS = ['originalPointer','originalLocator','originalMaker','rightsState'];
const READING_KEYS = ['readingHand','claim','limit'];
const id = s => typeof s === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(s);
const prose = (s,n=1000) => typeof s === 'string' && s.trim().length > 0 && s.length <= n;
const digest = s => createHash('sha256').update(s,'utf8').digest('hex');
// Node UTF-8 replaces isolated UTF-16 surrogate units with U+FFFD. Reject
// ill-formed bodies before hashing: the alias is in the encoder, not SHA-256.
const wellFormedText = s => typeof s === 'string' && s.isWellFormed();
function shape(o,keys,label) {
  if (!o || typeof o !== 'object' || Array.isArray(o) ||
      Object.keys(o).length !== keys.length || keys.some(k => !Object.hasOwn(o,k)))
    throw new Error('Unsupported ' + label + ' fields');
}
function isBoundary(text,offset) {
  // JS slice offsets count UTF-16 code units. Do not cut an emoji in half.
  if (offset <= 0 || offset >= text.length) return true;
  const before = text.charCodeAt(offset-1), at = text.charCodeAt(offset);
  return !(before >= 0xD800 && before <= 0xDBFF && at >= 0xDC00 && at <= 0xDFFF);
}
function validSpan(text,start,end) {
  return Number.isSafeInteger(start) && Number.isSafeInteger(end) &&
    start >= 0 && end > start && end <= text.length && end-start <= 4096 &&
    isBoundary(text,start) && isBoundary(text,end);
}
function validateSnapshot(snapshot) {
  shape(snapshot,['fileId','revision','body','bodyDigest'],'snapshot');
  if (!id(snapshot.fileId) || !id(snapshot.revision) ||
      !prose(snapshot.body,10_000_000) || !wellFormedText(snapshot.body) ||
      !HEX.test(snapshot.bodyDigest) ||
      digest(snapshot.body) !== snapshot.bodyDigest)
    throw new Error('Snapshot identity or body digest mismatch');
}
export function makeSourceSnapshot(fileId,revision,body) {
  if (!id(fileId) || !id(revision) || !prose(body,10_000_000) ||
      !wellFormedText(body))
    throw new Error('Invalid source snapshot: ill-formed UTF-16 text');
  return {fileId,revision,body,bodyDigest:digest(body)};
}
function recordHash(record) {
  // Internal check only: anyone able to rewrite the whole record can recompute it.
  return digest(JSON.stringify([SOURCE_SPAN_SCHEMA,record.id,record.parent,
    record.span,record.source,record.reading]));
}
function validateRecord(record) {
  shape(record,RECORD_KEYS,'source span record');
  shape(record.parent,PARENT_KEYS,'parent');
  shape(record.span,SPAN_KEYS,'span');
  shape(record.source,SOURCE_KEYS,'source');
  shape(record.reading,READING_KEYS,'reading');
  if (record.schema !== SOURCE_SPAN_SCHEMA || !id(record.id) ||
      !id(record.parent.fileId) || !id(record.parent.revision) ||
      !HEX.test(record.parent.bodyDigest) || !HEX.test(record.span.excerptDigest) ||
      !Number.isSafeInteger(record.span.start) || !Number.isSafeInteger(record.span.end) ||
      record.span.start < 0 || record.span.end <= record.span.start ||
      record.span.end-record.span.start > 4096 ||
      !prose(record.source.originalPointer,2048) ||
      !prose(record.source.originalLocator,512) ||
      !prose(record.source.originalMaker,256) ||
      record.source.rightsState !== 'unverified' ||
      !prose(record.reading.readingHand,256) ||
      !prose(record.reading.claim,2000) || !prose(record.reading.limit,2000) ||
      !HEX.test(record.recordDigest) || recordHash(record) !== record.recordDigest)
    throw new Error('Source span record mismatch');
}
// Source pointer and original maker are explicitly given, NEVER inferred from
// nearby hyperlinks, the container title, text adjacency, or the reading hand.
export function bindSourceSpan({id:spanId,snapshot,start,end,exactText,
  originalPointer,originalLocator,originalMaker,readingHand,claim,limit}={}) {
  validateSnapshot(snapshot);
  if (!id(spanId) || !validSpan(snapshot.body,start,end) ||
      !prose(exactText,4096) || snapshot.body.slice(start,end) !== exactText ||
      !prose(originalPointer,2048) || !prose(originalLocator,512) ||
      !prose(originalMaker,256) || !prose(readingHand,256) ||
      !prose(claim,2000) || !prose(limit,2000))
    throw new Error('Unbound or mismatched source span');
  const record={
    schema:SOURCE_SPAN_SCHEMA,id:spanId,
    parent:{fileId:snapshot.fileId,revision:snapshot.revision,bodyDigest:snapshot.bodyDigest},
    span:{start,end,excerptDigest:digest(exactText)},
    source:{originalPointer,originalLocator,originalMaker,rightsState:'unverified'},
    reading:{readingHand,claim,limit}
  };
  return structuredClone({...record,recordDigest:recordHash(record)});
}
export function readSourceSpan(record,snapshot) {
  validateRecord(record);
  validateSnapshot(snapshot);
  if (record.parent.fileId !== snapshot.fileId ||
      record.parent.revision !== snapshot.revision ||
      record.parent.bodyDigest !== snapshot.bodyDigest)
    throw new Error('Source span requires exact pinned parent snapshot');
  const {start,end,excerptDigest}=record.span;
  if (!validSpan(snapshot.body,start,end))
    throw new Error('Invalid source span boundaries');
  const exactText=snapshot.body.slice(start,end);
  if (digest(exactText)!==excerptDigest)
    throw new Error('Source span excerpt mismatch');
  return {id:record.id,fileId:record.parent.fileId,
    revision:record.parent.revision,exactText,
    source:structuredClone(record.source),reading:structuredClone(record.reading),
    rightsVerified:false, originalSourceIndependentlyInspected:false};
}
export function readSelectedSpans(records,snapshots,ids) {
  if (!Array.isArray(records) || !Array.isArray(snapshots) || !Array.isArray(ids) ||
      ids.some(x=>!id(x)) || new Set(ids).size!==ids.length)
    throw new Error('Invalid span selection');
  const byId=new Map(), bySnapshot=new Map();
  for(const r of records) {
    validateRecord(r);
    if(byId.has(r.id)) throw new Error('Duplicate source span ID');
    byId.set(r.id,r);
  }
  for(const s of snapshots) {
    validateSnapshot(s);
    const key=s.fileId+'@'+s.revision;
    if(bySnapshot.has(key)) throw new Error('Duplicate parent snapshot');
    bySnapshot.set(key,s);
  }
  return ids.map(wanted=>{
    const record=byId.get(wanted);
    if(!record) throw new Error('Source span not found');
    const snap=bySnapshot.get(record.parent.fileId+'@'+record.parent.revision);
    if(!snap) throw new Error('Exact source snapshot not supplied');
    return readSourceSpan(record,snap);
  });
}
