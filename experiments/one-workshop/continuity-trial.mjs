// Blinded, source-receipt-aware evaluation harness for fictional continuity cases.
// This code does NOT call a model, check historical truth, or grade answer prose.
// Never send the reviewer packet or case rubric to an answerer.
import { createHash } from 'node:crypto';
import { cases, getCase } from './continuity-trial-cases.mjs';
export const TRIAL_SCHEMA = 'earthlyhands.continuity-trial.fixture.v0';
export const CONDITIONS = Object.freeze(['baseline', 'A-retrieval', 'B-self-check', 'C-independent-check']);
export const PHASES = Object.freeze(['immediate', 'after-intervening', 'fresh-return', 'other-companion']);
const METRICS = Object.freeze([
  'evidenceFidelity', 'correctionUptake', 'unsupportedSuspicion',
  'overreach', 'recoverability', 'falseVeto', 'irrelevantIntrusion'
]);
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const ident = x => typeof x === 'string' && /^[A-Za-z0-9_.:-]{1,100}$/.test(x);
const prose = x => typeof x === 'string' && x.trim().length > 0 && x.length <= 20000;
const exactRefs = xs => Array.isArray(xs) && xs.length <= 20 &&
  xs.every(x => object(x) && ident(x.id) && ident(x.revision)) &&
  new Set(xs.map(x => x.id + '@' + x.revision)).size === xs.length;
const refs = xs => xs.map(x => ({ id: x.id, revision: x.revision }));
const sameRefs = (a, b) => JSON.stringify([...a].sort((x, y) => x.id.localeCompare(y.id))) ===
  JSON.stringify([...b].sort((x, y) => x.id.localeCompare(y.id)));
function checkEntry(e) {
  if (!object(e) || !ident(e.runId) || !ident(e.caseId) ||
      !CONDITIONS.includes(e.condition) || !PHASES.includes(e.phase) ||
      !ident(e.trialId) || !ident(e.blindId) || !getCase(e.caseId)) throw new Error('Invalid plan entry');
}
function expected(e) {
  const c = getCase(e.caseId);
  return { sources: refs(c.sources), corrections: e.condition === 'baseline' ? [] :
    [{ id: c.correction.id, revision: c.correction.revision }] };
}
// A stable, opaque review ID is for masking, NOT an authorization or cryptographic secret.
export function makePlan(runId, blindSalt) {
  if (!ident(runId) || !prose(blindSalt) || blindSalt.length < 16)
    throw new Error('Run ID and independent blind salt required');
  const entries = [];
  for (let pi = 0; pi < PHASES.length; pi++) {
    for (let ci = 0; ci < cases.length; ci++) {
      for (let k = 0; k < CONDITIONS.length; k++) {
        const condition = CONDITIONS[(k + ci + pi) % CONDITIONS.length];
        const caseId = cases[ci].id, phase = PHASES[pi];
        // Neither the answerer-facing trial ID nor the review ID encodes
        // condition or timing in plain text. The private plan retains the mapping.
        const trialId = 'trial-' + createHash('sha256')
          .update('answerer:' + blindSalt + ':' +
            [runId, caseId, phase, condition].join(':')).digest('hex').slice(0, 24);
        const blindId = 'blind-' + createHash('sha256')
          .update('reviewer:' + blindSalt + ':' + trialId).digest('hex').slice(0, 20);
        entries.push({ schema: TRIAL_SCHEMA, runId, trialId, blindId, caseId, phase, condition });
      }
    }
  }
  return entries;
}
export function makeAnswererPacket(e) {
  checkEntry(e);
  const c = getCase(e.caseId);
  return {
    schema: TRIAL_SCHEMA, trialId: e.trialId, prompt: c.prompt,
    sourceCards: structuredClone(c.sources),
    correctionCards: e.condition === 'baseline' ? [] : [structuredClone(c.correction)],
    // The checker in C is a separate process; the answerer receives no checker rubric.
    instruction: e.condition === 'B-self-check' ?
      'Before delivering your answer, compare its claims with the applicable source and correction cards. Respect their scope; new contrary evidence may change a conclusion.' :
      'Answer from the supplied source cards, with appropriate uncertainty.'
  };
}
export function recordObservation(e, data) {
  checkEntry(e);
  if (!object(data) || !ident(data.answererId) || !ident(data.modelConfig) ||
      !prose(data.finalAnswer) || !exactRefs(data.deliveredSources) ||
      !exactRefs(data.deliveredCorrections) ||
      !['host-log', 'manual-report'].includes(data.deliveryMethod) ||
      !prose(data.deliveryReceipt) ||
      !['not-tested', 'recognized', 'missed', 'inconclusive'].includes(data.recognition) ||
      !Number.isSafeInteger(data.humanRepairTurns) || data.humanRepairTurns < 0)
    throw new Error('Incomplete observed answer or delivery receipt');
  if (data.proposedAnswer !== undefined && !prose(data.proposedAnswer))
    throw new Error('Invalid proposed answer');
  if (e.condition === 'C-independent-check' &&
      (!object(data.checker) || !ident(data.checker.id) ||
       data.checker.id === data.answererId ||
       !['accepted', 'revision-requested', 'inconclusive'].includes(data.checker.verdict) ||
       !prose(data.checker.notes) || !prose(data.proposedAnswer)))
    throw new Error('Condition C needs a distinct checker and proposed answer');
  const wants = expected(e);
  const deliveryComplete = sameRefs(data.deliveredSources, wants.sources) &&
    sameRefs(data.deliveredCorrections, wants.corrections);
  return structuredClone({
    schema: TRIAL_SCHEMA, trialId: e.trialId, blindId: e.blindId,
    caseId: e.caseId, phase: e.phase, condition: e.condition,
    answererId: data.answererId, modelConfig: data.modelConfig,
    delivery: { method: data.deliveryMethod, receipt: data.deliveryReceipt,
      sourceRefs: data.deliveredSources, correctionRefs: data.deliveredCorrections,
      complete: deliveryComplete },
    recognition: data.recognition, proposedAnswer: data.proposedAnswer ?? null,
    finalAnswer: data.finalAnswer, checker: data.checker ?? null,
    humanRepairTurns: data.humanRepairTurns
  });
}
// Reviewer sees the source and final answer, but not condition, model, timing,
// recognition score, checker verdict, human interventions, or trial ID.
export function makeReviewerPacket(observation) {
  if (!object(observation) || observation.schema !== TRIAL_SCHEMA ||
      !ident(observation.blindId) || !prose(observation.finalAnswer))
    throw new Error('Invalid observation');
  const c = getCase(observation.caseId);
  return {
    schema: TRIAL_SCHEMA, blindId: observation.blindId,
    prompt: c.prompt, sourceCards: structuredClone(c.sources),
    correctionCard: structuredClone(c.correction),
    finalAnswer: observation.finalAnswer,
    rubric: structuredClone(c.rubric),
    guidance: 'Judge the actual final claims against the source and scope. Do not use keyword matching. A sourced disagreement or a refusal to intrude with irrelevant corrections may be correct.'
  };
}
export function recordReview(observation, data) {
  if (!object(observation) || observation.schema !== TRIAL_SCHEMA ||
      !object(data) || data.blindId !== observation.blindId ||
      !ident(data.reviewerId) || data.reviewerId === observation.answererId ||
      data.reviewerId === observation.checker?.id ||
      !['graded', 'inconclusive'].includes(data.verdict) || !prose(data.notes))
    throw new Error('Invalid or non-independent review');
  if (data.verdict === 'graded') {
    if (!object(data.metrics) || METRICS.some(k => typeof data.metrics[k] !== 'boolean'))
      throw new Error('Every graded metric must be explicitly true or false');
  } else if (data.metrics !== null) {
    throw new Error('Inconclusive review cannot smuggle in zero scores');
  }
  return structuredClone({
    schema: TRIAL_SCHEMA, blindId: observation.blindId, trialId: observation.trialId,
    reviewerId: data.reviewerId, verdict: data.verdict, notes: data.notes,
    metrics: data.verdict === 'graded' ? Object.fromEntries(METRICS.map(k => [k, data.metrics[k]])) : null
  });
}
export function summarizePlan(plan, observations = [], reviews = []) {
  if (!Array.isArray(plan) || !Array.isArray(observations) || !Array.isArray(reviews))
    throw new Error('Invalid trial collections');
  const entries = new Map();
  for (const e of plan) {
    checkEntry(e);
    if (entries.has(e.trialId)) throw new Error('Duplicate planned trial');
    entries.set(e.trialId, e);
  }
  const seenObs = new Map(), seenReviews = new Map();
  for (const o of observations) {
    const e = entries.get(o?.trialId);
    if (!object(o) || !e || seenObs.has(o.trialId) ||
        o.schema !== TRIAL_SCHEMA || o.blindId !== e.blindId ||
        o.caseId !== e.caseId || o.phase !== e.phase || o.condition !== e.condition ||
        !object(o.delivery) || !exactRefs(o.delivery.sourceRefs) ||
        !exactRefs(o.delivery.correctionRefs) ||
        o.delivery.complete !== (
          sameRefs(o.delivery.sourceRefs, expected(e).sources) &&
          sameRefs(o.delivery.correctionRefs, expected(e).corrections)
        ) || !prose(o.finalAnswer) || !Number.isSafeInteger(o.humanRepairTurns) ||
        o.humanRepairTurns < 0) throw new Error('Duplicate/unplanned observation');
    seenObs.set(o.trialId, o);
  }
  for (const v of reviews) {
    const o = seenObs.get(v?.trialId);
    if (!object(v) || !o || seenReviews.has(v.trialId) ||
        v.schema !== TRIAL_SCHEMA || v.blindId !== o.blindId ||
        !ident(v.reviewerId) || v.reviewerId === o.answererId ||
        v.reviewerId === o.checker?.id || !prose(v.notes) ||
        !['graded', 'inconclusive'].includes(v.verdict) ||
        (v.verdict === 'graded' &&
          (!object(v.metrics) || METRICS.some(k => typeof v.metrics[k] !== 'boolean'))) ||
        (v.verdict === 'inconclusive' && v.metrics !== null))
      throw new Error('Duplicate/unmatched review');
    seenReviews.set(v.trialId, v);
  }
  return CONDITIONS.map(condition => {
    const subset = [...entries.values()].filter(e => e.condition === condition);
    const observed = subset.map(e => seenObs.get(e.trialId)).filter(Boolean);
    const graded = observed.map(o => ({ o, v: seenReviews.get(o.trialId) }))
      .filter(x => x.v?.verdict === 'graded');
    // Separate the retrieval gate from answer-use. A graded answer whose
    // correction was never delivered is not evidence that self-checking failed.
    const gradedCompleteDelivery = graded.filter(x => x.o.delivery.complete);
    const metrics = Object.fromEntries(METRICS.map(k => [k,
      gradedCompleteDelivery.length ? {
        trueCount: gradedCompleteDelivery.filter(x => x.v.metrics[k] === true).length,
        denominator: gradedCompleteDelivery.length
      } : null]));
    return {
      condition, planned: subset.length, observed: observed.length,
      deliveryComplete: observed.filter(o => o.delivery?.complete === true).length,
      graded: graded.length,
      gradedCompleteDelivery: gradedCompleteDelivery.length,
      gradedWithDeliveryGap: graded.length - gradedCompleteDelivery.length,
      inconclusive: observed.filter(o => seenReviews.get(o.trialId)?.verdict === 'inconclusive').length,
      awaitingReview: observed.filter(o => !seenReviews.has(o.trialId)).length,
      unobserved: subset.length - observed.length,
      humanRepairTurns: gradedCompleteDelivery.length ?
        gradedCompleteDelivery.reduce((n, x) => n + x.o.humanRepairTurns, 0) : null,
      metrics
    };
  });
}
