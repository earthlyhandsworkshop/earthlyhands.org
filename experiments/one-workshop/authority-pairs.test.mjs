import test from 'node:test';
import assert from 'node:assert/strict';
import { planAuthorityPairs, makeAnswererPacket, checkRolePair,
  makeUnobservedPairReceipt, CONDITIONS, CONTEXTS, SPEAKERS } from './authority-pairs.mjs';
const plan = planAuthorityPairs('oct28', 'private-fictional-blind-salt');
const rows = (context, task, condition) => plan.filter(r => r.context === context && r.taskId === task && r.condition === condition);

test('48 trial slots make exactly 24 matched authority pairs', () => {
  assert.equal(plan.length, 48);
  assert.equal(new Set(plan.map(p => p.trialId)).size, 48);
  assert.equal(new Set(plan.map(p => p.pairId)).size, 24);
  assert.equal(CONTEXTS.length, 4);
  assert.equal(CONDITIONS.length, 2);
  assert.equal(Object.keys(SPEAKERS).length, 2);
});
test('actual role contrast is researcher versus fictional official', () => {
  const [a,b] = rows('immediate', 'factual', 'source-only');
  const pa = makeAnswererPacket(a, plan), pb = makeAnswererPacket(b, plan);
  assert.match(pa.prompt, /independent researcher/);
  assert.match(pb.prompt, /official of the fictional Council Office/);
  const pair = checkRolePair(a, pa, b, pb);
  assert.equal(pair.sameSources,true);
  assert.equal(pair.sameCorrections,true);
  assert.equal(pair.roleOnlyPromptDifference,true);
});
test('speaker role is the only intended prompt variable for all 24 pairs', () => {
  for (const context of CONTEXTS) for (const task of ['factual','counter','satire'])
    for (const condition of CONDITIONS) {
      const [a,b] = rows(context,task,condition);
      const result = checkRolePair(a,makeAnswererPacket(a,plan),b,makeAnswererPacket(b,plan));
      assert.equal(result.sameSources,true);
      assert.equal(result.sameCorrections,true);
      assert.equal(result.roleOnlyPromptDifference,true);
    }
});
test('source-only baseline excludes correction; corrected trial has one', () => {
  const a = rows('fresh-return','satire','source-only')[0];
  const b = rows('fresh-return','satire','source-and-correction')[0];
  assert.equal(makeAnswererPacket(a,plan).correctionCards.length,0);
  assert.equal(makeAnswererPacket(b,plan).correctionCards.length,1);
});
test('answerer packet does not expose planned context, condition, pair key or rubric', () => {
  const row = rows('long-conversation','counter','source-and-correction')[0];
  const packet = makeAnswererPacket(row,plan);
  for (const k of ['context','condition','speaker','pairId','expected','rubric','reviewer'])
    assert.equal(Object.hasOwn(packet,k),false);
});
test('forged, cross-task and source-tampered pairs are not accepted', () => {
  const [a,b] = rows('immediate','factual','source-only');
  assert.throws(() => makeAnswererPacket({...a,speaker:'institutional'},plan),/Unrecognized/);
  const c = rows('immediate','satire','source-only')[0];
  assert.throws(() => checkRolePair(a,makeAnswererPacket(a,plan),c,makeAnswererPacket(c,plan)),/Not a matched/);
  const fake = {...makeAnswererPacket(b,plan),sourceCards:[]};
  assert.equal(checkRolePair(a,makeAnswererPacket(a,plan),b,fake).sameSources,false);
});
test('identical tampering of two correction cards is also rejected', () => {
  const [a,b] = rows('immediate','factual','source-and-correction');
  const p = makeAnswererPacket(a,plan), q = makeAnswererPacket(b,plan);
  p.correctionCards[0].text = 'Forged shared edit';
  q.correctionCards[0].text = 'Forged shared edit';
  assert.equal(checkRolePair(a,p,b,q).sameCorrections,false);
});
test('packet mutation cannot alter another trial or fixture', () => {
  const [a,b] = rows('unrelated-work','satire','source-and-correction');
  const pa = makeAnswererPacket(a,plan);
  pa.sourceCards[0].text='tampered';
  pa.correctionCards[0].text='tampered';
  const pb = makeAnswererPacket(b,plan);
  assert.notEqual(pb.sourceCards[0].text,'tampered');
  assert.notEqual(pb.correctionCards[0].text,'tampered');
});
test('planned receipt is unobserved and never asserts a model result', () => {
  const [a,b]=rows('fresh-return','factual','source-only');
  const witness=makeUnobservedPairReceipt(a,b,plan);
  assert.equal(witness.status,'unobserved');
  assert.equal(witness.actualSessionContexts,null);
  assert.equal(witness.sourceDeliveryReceipts,null);
  assert.equal(witness.modelOutputs,null);
  assert.equal(witness.independentReview,null);
  assert.equal(witness.trials.length,2);
});

test('pair witness refuses swapped trial identities and shared prompt injection', () => {
  const [a,b] = rows('fresh-return','satire','source-and-correction');
  const pa = makeAnswererPacket(a,plan), pb = makeAnswererPacket(b,plan);
  const swapped = checkRolePair(a,{...pa,trialId:b.trialId},b,{...pb,trialId:a.trialId});
  assert.equal(swapped.validIdentity,false);
  assert.equal(swapped.roleOnlyPromptDifference,false);
  const injected = checkRolePair(a,{...pa,prompt:pa.prompt+' Added shared text.'},
    b,{...pb,prompt:pb.prompt+' Added shared text.'});
  assert.equal(injected.validIdentity,true);
  assert.equal(injected.roleOnlyPromptDifference,false);
  const missingSchema = checkRolePair(a,{...pa,schema:'unrecognized'},b,pb);
  assert.equal(missingSchema.validIdentity,false);
  assert.throws(() => makeUnobservedPairReceipt(a,b,plan.filter(x=>x.trialId!==a.trialId)),
    /Unrecognized/);
});
