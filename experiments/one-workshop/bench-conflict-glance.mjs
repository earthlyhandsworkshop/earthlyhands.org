// Fictional Old-Growth Workbench conflict glance. Advisory, not a truth engine,
// authentication service, permission grant, storage system, or custody mover.
// A trusted adapter must authenticate and prefilter records before use.
export const GLANCE_SCHEMA = 'earthlyhands.bench-conflict-glance.fixture.v0';
const ranks = Object.freeze({ public: 0, workshop: 1, private: 2 });
const verbs = new Set(['move', 'release-locator', 'rest', 'close-encounter']);
const obj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const text = x => typeof x === 'string' && x.trim().length > 0 && x.length <= 300;
const id = x => typeof x === 'string' && /^[A-Za-z0-9_.:-]{1,120}$/.test(x);
const visible = (v, a) => Object.hasOwn(ranks, v) && ranks[v] <= ranks[a];

function checkCandidate(c, audience) {
  if (!obj(c) || !id(c.id) || !id(c.objectId) || !visible(c.visibility, audience))
    throw new Error('Invalid candidate identity or audience');
  for (const f of ['revision', 'assertionKey', 'scopeKey', 'claimValue'])
    if (c[f] !== undefined && !text(c[f])) throw new Error('Invalid candidate ' + f);
  if (c.sourceRefs !== undefined && (!Array.isArray(c.sourceRefs) || c.sourceRefs.length > 40 ||
    !c.sourceRefs.every(s => obj(s) && id(s.id) && Object.hasOwn(ranks, s.visibility))))
    throw new Error('Invalid source refs');
  if (c.pairIds !== undefined && (!Array.isArray(c.pairIds) || c.pairIds.length > 40 ||
    !c.pairIds.every(id) || new Set(c.pairIds).size !== c.pairIds.length))
    throw new Error('Invalid pair IDs');
}

// Exact object/claim/scope keys are the only match anchors. Similar titles or
// people-names alone cannot justify a warning, merger, or identity decision.
export function inspectBenchConflicts({ phase, audience, candidate, neighbors = [], crossing = null }) {
  if (!['working', 'clearing'].includes(phase) || !Object.hasOwn(ranks, audience))
    throw new Error('Unknown phase or audience');
  checkCandidate(candidate, audience);
  if (!Array.isArray(neighbors) || neighbors.length > 500) throw new Error('Invalid neighbors');
  if (phase === 'clearing' && (!obj(crossing) || !verbs.has(crossing.verb) ||
      !['plan', 'finish'].includes(crossing.step))) throw new Error('Invalid crossing');
  const warnings = [];
  const add = (code, relatedIds, why, inspect) => warnings.push({ code, relatedIds, why, inspect });
  // Filter BEFORE matching or deriving any output: hidden records must not even
  // alter the number of notices returned to a less-privileged audience.
  const peers = neighbors.filter(n => obj(n) && visible(n.visibility, audience) &&
    id(n.id) && id(n.objectId) && n.id !== candidate.id);

  if (candidate.assertionKey && !(candidate.sourceRefs?.length))
    add('claim-without-source', [], 'A proposed claim has no exact source reference.',
      'Locate its source road before relying on the claim.');
  if (candidate.sourceRefs?.some(s => ranks[s.visibility] > ranks[candidate.visibility]))
    add('source-audience-mismatch', [], 'A cited source is more restricted than the proposed view.',
      'Ask an authorized source hand to examine permission; do not publish from this warning.');
  for (const n of peers) {
    if (candidate.objectId === n.objectId && text(candidate.revision) && text(n.revision) &&
        candidate.revision !== n.revision)
      add('version-divergence', [n.id], 'One exact object identity has different recorded revisions.',
        'Compare the versions; preserve the superseded source road.');
    if (text(candidate.assertionKey) && text(candidate.scopeKey) && text(candidate.claimValue) &&
        candidate.assertionKey === n.assertionKey && candidate.scopeKey === n.scopeKey &&
        text(n.claimValue) && candidate.claimValue !== n.claimValue)
      add('claim-tension', [n.id], 'Different values occur under identical assertion and scope keys.',
        'Inspect dates, qualifiers, and both source roads; neither value is automatically false.');
  }
  if (phase === 'clearing') {
    const c = crossing;
    if (c.authority !== 'confirmed')
      add('authority-unconfirmed', [], 'No confirmed custody authority is recorded for this crossing.',
        'Ask the responsible hand, or leave an exact unresolved rest.');
    if (['move', 'rest'].includes(c.verb) && !text(c.destination))
      add('destination-not-named', [], 'The proposed crossing lacks an exact destination.',
        'Name a destination before clearing this object.');
    if (c.verb === 'move') {
      const moving = Array.isArray(c.movingIds) ? c.movingIds : [];
      const missing = (candidate.pairIds ?? []).filter(x => !moving.includes(x));
      if (missing.length)
        add('pair-not-accounted-for', missing, 'A declared paired object is missing from the move.',
          'Check the exact pairing and authority before moving either object.');
      // Compare only exact target FILE paths, never shared folder destinations.
      if (text(c.targetPath)) for (const n of peers)
        if (n.objectId !== candidate.objectId && n.targetPath === c.targetPath)
          add('exact-target-collision', [n.id], 'Another visible object claims the same exact target path.',
            'Verify identities and choose a distinct, provenance-preserving path.');
    }
    if (c.verb === 'release-locator') {
      if (c.sourceReachable !== true)
        add('locator-source-unverified', [], 'The locator source has not been verified reachable.',
          'Verify the unchanged original before releasing the locator.');
      if (c.moveOriginal === true)
        add('locator-not-source', [], 'The proposed locator release also moves its original.',
          'Keep the original in place unless it has a separately authorized move.');
    }
    if (c.verb === 'close-encounter' && c.hasUnresolved === true && c.unresolvedDisposition !== 'named-rest')
      add('unresolved-rest-unaccounted', [], 'The encounter has not named where its unresolved matter rests.',
        'Give it an exact return address without declaring it settled.');
    if (c.step === 'finish') {
      if (c.landingVerified !== true)
        add('landing-not-verified', [], 'The intended crossing has no verified result.',
          'Read back the actual destination before clearing the active locator.');
      if (!id(c.receiptId))
        add('crossing-receipt-missing', [], 'No exact return receipt identifies this crossing.',
          'Keep a one-to-one record of the object, its verb, and verified home.');
    }
  }
  return warnings.sort((a, b) => a.code.localeCompare(b.code) ||
    (a.relatedIds[0] ?? '').localeCompare(b.relatedIds[0] ?? ''));
}
