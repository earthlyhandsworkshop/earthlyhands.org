import test from 'node:test';
import assert from 'node:assert/strict';
import {
  makePlan, makeAnswererPacket, recordObservation, makeReviewerPacket,
  recordReview, summarizePlan, CONDITIONS, PHASES
} from './continuity-trial.mjs';
import { cases } from './continuity-trial-cases.mjs';

const plan = makePlan('run-01', 'fictional-review-salt-keep-separate');
const entry = (caseId = 'F3-refusal-accusation', condition = 'A-retrieval',
  phase = 'immediate') => plan.find(x => x.caseId === caseId &&
    x.condition === condition && x.phase === phase);
function data(e, overrides = {}) {
  const packet = makeAnswererPacket(e);
  return {
    answererId: 'responder-a', modelConfig: 'model-test-config',
    finalAnswer: 'This fictional decision does not itself make a fraud finding.',
    deliveredSources: packet.sourceCards.map(x => ({ id: x.id, revision: x.revision })),
    deliveredCorrections: packet.correctionCards.map(x => ({ id: x.id, revision: x.revision })),
    deliveryMethod: 'host-log', deliveryReceipt: 'fixture-host-delivery-001',
    recognition: 'recognized', humanRepairTurns: 0,
    ...(e.condition === 'C-independent-check' ? {
      proposedAnswer: 'This fictional decision does not itself make a fraud finding.',
      checker: { id: 'checker-b', verdict: 'accepted', notes: 'No scope violation found in the fictional proposal.' }
    } : {}),
    ...overrides
  };
}
const metrics = {
  evidenceFidelity: true, correctionUptake: true, unsupportedSuspicion: false,
  overreach: false, recoverability: true, falseVeto: false, irrelevantIntrusion: false
};
function review(o, overrides = {}) {
  return recordReview(o, {
    blindId: o.blindId, reviewerId: 'independent-reviewer',
    verdict: 'graded', notes: 'Checked final claims against the fictional source and its exact scope.',
    metrics, ...overrides
  });
}

test('the plan is deterministic, counterbalanced and contains all six fictional cases', () => {
  assert.equal(plan.length, cases.length * CONDITIONS.length * PHASES.length);
  assert.equal(new Set(plan.map(x => x.trialId)).size, plan.length);
  assert.equal(new Set(plan.map(x => x.blindId)).size, plan.length);
  for (const c of cases) for (const condition of CONDITIONS) for (const phase of PHASES)
    assert.ok(entry(c.id, condition, phase));
  assert.deepEqual(makePlan('run-01', 'fictional-review-salt-keep-separate'), plan);
});

test('the answerer never receives the rubric, review ID or scoring hints', () => {
  const e = entry();
  const p = makeAnswererPacket(e);
  assert.equal(Object.hasOwn(p, 'rubric'), false);
  assert.equal(Object.hasOwn(p, 'blindId'), false);
  assert.equal(Object.hasOwn(p, 'expected'), false);
  assert.equal(JSON.stringify(p).includes('Converting refusal into an accusation'), false);
  assert.ok(p.correctionCards[0].text.includes('fraud finding'));
});

test('baseline has no correction card; B alone receives explicit self-check instruction', () => {
  const baseline = makeAnswererPacket(entry('F3-refusal-accusation', 'baseline'));
  const a = makeAnswererPacket(entry());
  const b = makeAnswererPacket(entry('F3-refusal-accusation', 'B-self-check'));
  const c = makeAnswererPacket(entry('F3-refusal-accusation', 'C-independent-check'));
  assert.equal(baseline.correctionCards.length, 0);
  assert.equal(a.correctionCards.length, 1);
  assert.equal(c.correctionCards.length, 1);
  assert.match(b.instruction, /compare its claims/i);
  assert.doesNotMatch(c.instruction, /compare its claims/i);
});

test('no observations means no invented experimental success or zero-valued metrics', () => {
  const summary = summarizePlan(plan);
  assert.equal(summary.length, 4);
  assert.ok(summary.every(x => x.planned === 24 && x.observed === 0 &&
    x.graded === 0 && x.unobserved === 24 && x.metrics.evidenceFidelity === null &&
    x.humanRepairTurns === null));
});

test('delivery receipt is recorded separately from recognition and answer quality', () => {
  const e = entry();
  const o = recordObservation(e, data(e, { recognition: 'missed' }));
  assert.equal(o.delivery.complete, true);
  assert.equal(o.recognition, 'missed');
  assert.equal(o.finalAnswer.length > 0, true);
});

test('a missing correction is a delivery gap, not a fabricated zero or successful retrieval', () => {
  const e = entry();
  const o = recordObservation(e, data(e, { deliveredCorrections: [] }));
  assert.equal(o.delivery.complete, false);
  const s = summarizePlan(plan, [o]);
  assert.equal(s.find(x => x.condition === 'A-retrieval').deliveryComplete, 0);
  assert.equal(s.find(x => x.condition === 'A-retrieval').graded, 0);
});

test('wrong revision is recognized as incomplete delivery, even when the ID matches', () => {
  const e = entry();
  const o = recordObservation(e, data(e, {
    deliveredCorrections: [{ id: 'F3-distinction', revision: 'older' }]
  }));
  assert.equal(o.delivery.complete, false);
});

test('a blind reviewer sees the final answer and source rubric, not model or condition', () => {
  const e = entry('F5-legitimate-reopening', 'C-independent-check', 'fresh-return');
  const o = recordObservation(e, data(e));
  const p = makeReviewerPacket(o);
  assert.equal(p.blindId, e.blindId);
  for (const forbidden of ['condition', 'trialId', 'modelConfig', 'answererId', 'checker',
    'recognition', 'humanRepairTurns', 'phase', 'delivery']) {
    assert.equal(Object.hasOwn(p, forbidden), false);
  }
  assert.match(p.rubric.watchFor, /Dogmatic/);
});

test('condition C needs a distinct checker and a proposed answer', () => {
  const e = entry('F3-refusal-accusation', 'C-independent-check');
  assert.throws(() => recordObservation(e, data(e, { checker: null })), /distinct checker/);
  assert.throws(() => recordObservation(e, data(e, {
    checker: { id: 'responder-a', verdict: 'accepted', notes: 'self checked' }
  })), /distinct checker/);
  assert.throws(() => recordObservation(e, data(e, { proposedAnswer: undefined })), /distinct checker/);
});

test('a reviewer cannot be the answerer or the condition-C checker', () => {
  const e = entry('F3-refusal-accusation', 'C-independent-check');
  const o = recordObservation(e, data(e));
  assert.throws(() => review(o, { reviewerId: 'responder-a' }), /non-independent/);
  assert.throws(() => review(o, { reviewerId: 'checker-b' }), /non-independent/);
});

test('an inconclusive review must remain unscored, not a row of zeros', () => {
  const e = entry();
  const o = recordObservation(e, data(e));
  const v = review(o, { verdict: 'inconclusive', metrics: null,
    notes: 'The final answer cannot be judged from this incomplete fictional source packet.' });
  const s = summarizePlan(plan, [o], [v]).find(x => x.condition === 'A-retrieval');
  assert.equal(s.inconclusive, 1);
  assert.equal(s.graded, 0);
  assert.equal(s.metrics.correctionUptake, null);
  assert.throws(() => review(o, { verdict: 'inconclusive', metrics }), /cannot smuggle/);
});

test('graded metrics require explicit booleans; a missing flag is not false', () => {
  const e = entry(), o = recordObservation(e, data(e));
  const { falseVeto, ...missing } = metrics;
  assert.throws(() => review(o, { metrics: missing }), /explicitly true or false/);
});

test('one real observation is not counted as all 96 planned tests', () => {
  const e = entry(), o = recordObservation(e, data(e)), v = review(o);
  const s = summarizePlan(plan, [o], [v]);
  const a = s.find(x => x.condition === 'A-retrieval');
  assert.equal(a.planned, 24);
  assert.equal(a.observed, 1);
  assert.equal(a.graded, 1);
  assert.equal(a.unobserved, 23);
  assert.deepEqual(a.metrics.correctionUptake, { trueCount: 1, denominator: 1 });
  assert.equal(s.find(x => x.condition === 'C-independent-check').metrics.correctionUptake, null);
});

test('human repair turns are counted only for graded observations, not silently zeroed', () => {
  const e = entry(), o = recordObservation(e, data(e, { humanRepairTurns: 3 }));
  const a = summarizePlan(plan, [o]).find(x => x.condition === 'A-retrieval');
  assert.equal(a.humanRepairTurns, null);
  const b = summarizePlan(plan, [o], [review(o)]).find(x => x.condition === 'A-retrieval');
  assert.equal(b.humanRepairTurns, 3);
});

test('new adverse evidence and irrelevant corrections have explicit non-dogma rubrics', () => {
  const f5 = makeReviewerPacket(recordObservation(entry('F5-legitimate-reopening'),
    data(entry('F5-legitimate-reopening'))));
  const f6 = makeReviewerPacket(recordObservation(entry('F6-nonapplicability'),
    data(entry('F6-nonapplicability'))));
  assert.match(f5.rubric.expected, /new finding/);
  assert.match(f6.rubric.watchFor, /unrelated/);
});

test('duplicate or unplanned observations and reviews are rejected', () => {
  const e = entry(), o = recordObservation(e, data(e)), v = review(o);
  assert.throws(() => summarizePlan(plan, [o, o]), /Duplicate\/unplanned/);
  assert.throws(() => summarizePlan(plan, [o], [v, v]), /Duplicate\/unmatched/);
  assert.throws(() => summarizePlan(plan, [], [v]), /Duplicate\/unmatched/);
});

test('the harness does not call a model or invent an independent review', () => {
  const e = entry('F3-refusal-accusation', 'C-independent-check');
  const packet = makeAnswererPacket(e);
  assert.equal(Object.hasOwn(packet, 'finalAnswer'), false);
  assert.equal(Object.hasOwn(packet, 'checker'), false);
  assert.equal(summarizePlan(plan).every(x => x.graded === 0), true);
});

test('answerer trial IDs do not spell out condition, timing or case labels', () => {
  for (const e of plan) {
    const packet = makeAnswererPacket(e);
    assert.equal(packet.trialId, e.trialId);
    assert.equal(packet.trialId.includes(e.condition), false);
    assert.equal(packet.trialId.includes(e.phase), false);
    assert.equal(packet.trialId.includes(e.caseId), false);
    assert.equal(Object.hasOwn(packet, 'condition'), false);
  }
});

test('a scored answer without delivered correction stays outside answer-use denominators', () => {
  const e = entry(), o = recordObservation(e, data(e, { deliveredCorrections: [] }));
  const v = review(o);
  const s = summarizePlan(plan, [o], [v]).find(x => x.condition === 'A-retrieval');
  assert.equal(s.graded, 1);
  assert.equal(s.gradedWithDeliveryGap, 1);
  assert.equal(s.gradedCompleteDelivery, 0);
  assert.equal(s.metrics.correctionUptake, null);
  assert.equal(s.humanRepairTurns, null);
});

test('forged delivery-complete flags cannot enter a summary as genuine retrieval', () => {
  const e = entry(), o = recordObservation(e, data(e, { deliveredCorrections: [] }));
  assert.throws(() => summarizePlan(plan, [{ ...o, delivery: { ...o.delivery, complete: true } }]),
    /Duplicate\/unplanned/);
});

test('forged reviewer identity and missing rubric fields cannot inflate the summary', () => {
  const e = entry(), o = recordObservation(e, data(e)), v = review(o);
  assert.throws(() => summarizePlan(plan, [o], [{ ...v, reviewerId: 'responder-a' }]),
    /Duplicate\/unmatched/);
  const { falseVeto, ...missing } = v.metrics;
  assert.throws(() => summarizePlan(plan, [o], [{ ...v, metrics: missing }]),
    /Duplicate\/unmatched/);
});
