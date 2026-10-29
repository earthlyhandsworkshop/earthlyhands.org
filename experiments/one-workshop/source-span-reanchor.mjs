// A cold-return helper for fictional long source fingers. This yields candidates,
// never a new source-span record or evidence of original-source continuity.
import { makeSourceSnapshot, readSourceSpan } from './source-span.mjs';

export const REANCHOR_SCHEMA = 'earthlyhands.source-span-reanchor.v0-fixture';
export const MAX_CANDIDATES = 8;
const CONTEXT_RADIUS = 64;
const own = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
function checkTarget(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot) ||
      Object.keys(snapshot).length !== 4 ||
      !['fileId','revision','body','bodyDigest'].every(k => own(snapshot,k)))
    throw new Error('Target must be an exact source snapshot');
  const canonical = makeSourceSnapshot(snapshot.fileId,snapshot.revision,snapshot.body);
  if (canonical.bodyDigest !== snapshot.bodyDigest)
    throw new Error('Target body digest mismatch');
}
function safeBoundary(s,index) {
  if (index <= 0 || index >= s.length) return true;
  const prev=s.charCodeAt(index-1),next=s.charCodeAt(index);
  return !(prev >= 0xD800 && prev <= 0xDBFF && next >= 0xDC00 && next <= 0xDFFF);
}
function contextCheck(oldBody,oldStart,oldEnd,newBody,newStart,newEnd) {
  const left=oldBody.slice(Math.max(0,oldStart-CONTEXT_RADIUS),oldStart);
  const right=oldBody.slice(oldEnd,oldEnd+CONTEXT_RADIUS);
  return {
    before: left ? newBody.slice(Math.max(0,newStart-left.length),newStart)===left : 'unavailable',
    after: right ? newBody.slice(newEnd,newEnd+right.length)===right : 'unavailable'
  };
}

export function proposeSourceSpanReanchor(record,oldSnapshot,targetSnapshot) {
  // Validates the exact prior claim, including the pinned body and internal
  // record digest. This does not authenticate its original maker or rights.
  const prior=readSourceSpan(record,oldSnapshot);
  checkTarget(targetSnapshot);
  if (targetSnapshot.fileId !== oldSnapshot.fileId)
    throw new Error('Different parent file: requires a new provenance decision');
  if (targetSnapshot.revision === oldSnapshot.revision &&
      targetSnapshot.bodyDigest !== oldSnapshot.bodyDigest)
    throw new Error('Revision reused with different content');
  if (targetSnapshot.revision === oldSnapshot.revision)
    return {
      schema:REANCHOR_SCHEMA,spanId:record.id,
      from:{fileId:oldSnapshot.fileId,revision:oldSnapshot.revision,bodyDigest:oldSnapshot.bodyDigest},
      to:{fileId:targetSnapshot.fileId,revision:targetSnapshot.revision,bodyDigest:targetSnapshot.bodyDigest},
      status:'already-pinned',candidates:[],candidateLimitReached:false,
      unsafeBoundariesSeen:false,requiresIndependentReview:false,adopted:false
    };

  const phrase=prior.exactText, candidates=[];
  let position=0,overflow=false,unsafe=false;
  for (;;) {
    const start=targetSnapshot.body.indexOf(phrase,position);
    if (start===-1) break;
    const end=start+phrase.length;
    if (!safeBoundary(targetSnapshot.body,start) || !safeBoundary(targetSnapshot.body,end)) unsafe=true;
    else if(candidates.length < MAX_CANDIDATES) {
      candidates.push({start,end,context:contextCheck(oldSnapshot.body,record.span.start,
        record.span.end,targetSnapshot.body,start,end)});
    } else { overflow=true; break; }
    // A repeated substring may overlap another; never infer first-match identity.
    position=start+1;
  }
  let status=overflow?'many-candidates':candidates.length>1?'ambiguous':
    candidates.length===1?'single-candidate':unsafe?'unsafe-boundary-only':'not-found';
  return {
    schema:REANCHOR_SCHEMA,spanId:record.id,
    from:{fileId:oldSnapshot.fileId,revision:oldSnapshot.revision,bodyDigest:oldSnapshot.bodyDigest},
    to:{fileId:targetSnapshot.fileId,revision:targetSnapshot.revision,bodyDigest:targetSnapshot.bodyDigest},
    status,candidates,candidateLimitReached:overflow,unsafeBoundariesSeen:unsafe,
    requiresIndependentReview:true,adopted:false
  };
}
