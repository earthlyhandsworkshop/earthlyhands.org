// Public-safe, fictional Old-Growth Workbench continuity specimen.
// NOT a truth engine, reviewer identity check, access-control service, or durable database.
// Trusted adapters must authenticate readers/writers and verify source permissions.
export const SCHEMA = 'earthlyhands.bench-standing.fixture.v0';
const rank = Object.freeze({ public: 0, workshop: 1, private: 2 });
const maxEvents = 1000;

function object(x) { return x !== null && typeof x === 'object' && !Array.isArray(x); }
function nonempty(s) { return typeof s === 'string' && s.trim().length > 0 && s.length <= 1200; }
function requireString(s, label) {
  if (!nonempty(s)) throw new Error('Invalid ' + label);
}
function requireId(s, label) {
  if (typeof s !== 'string' || !/^[A-Za-z0-9_.:-]{1,100}$/.test(s)) throw new Error('Invalid ' + label);
}
function level(x) {
  if (!Object.hasOwn(rank, x)) throw new Error('Unknown visibility; refuse');
  return rank[x];
}
function sources(xs) {
  if (!Array.isArray(xs) || !xs.length || xs.length > 40) throw new Error('Source refs required');
  const ids = new Set();
  for (const x of xs) {
    if (!object(x)) throw new Error('Invalid source ref');
    requireId(x.id, 'source ID');
    level(x.visibility);
    if (ids.has(x.id)) throw new Error('Duplicate source ref');
    ids.add(x.id);
  }
}
function names(xs) {
  if (!Array.isArray(xs) || xs.length < 1 || xs.length > 40) throw new Error('Nonempty scope or reviewer list required');
  for (const x of xs) requireId(x, 'scope key or reviewer');
  if (new Set(xs).size !== xs.length) throw new Error('Duplicate scope key or reviewer');
}
function coveredBySources(visibility, sourceRefs) {
  // If the derived statement is made available to a wider group than an underlying
  // source, the public projection would leak source identity or restricted evidence.
  return sourceRefs.every(x => level(x.visibility) <= level(visibility));
}

export function emptyLedger() { return { schema: SCHEMA, generation: 0, events: [] }; }

function replay(ledger) {
  if (!object(ledger) || ledger.schema !== SCHEMA ||
      !Number.isSafeInteger(ledger.generation) ||
      !Array.isArray(ledger.events) ||
      ledger.generation !== ledger.events.length ||
      ledger.events.length > maxEvents) throw new Error('Invalid ledger');
  const proposals = new Map(), current = new Map(), withdrawals = new Map(), used = new Set();
  const settled = new Set(), challenges = [];
  for (const e of ledger.events) {
    if (!object(e)) throw new Error('Invalid event');
    requireId(e.eventId, 'event ID');
    requireString(e.recordedBy, 'recording hand');
    if (used.has(e.eventId)) throw new Error('Duplicate event ID');
    used.add(e.eventId);
    if (e.kind === 'propose') {
      requireId(e.proposalId, 'proposal ID');
      requireId(e.propositionId, 'proposition ID');
      requireString(e.standingText, 'proposed statement');
      requireString(e.reopenWhen, 'reopening condition');
      names(e.scopeKeys);
      level(e.visibility);
      sources(e.sourceRefs);
      if (proposals.has(e.proposalId)) throw new Error('Duplicate proposal');
      proposals.set(e.proposalId, e);
    } else if (e.kind === 'settle') {
      requireId(e.proposalId, 'proposal ID');
      requireString(e.reviewBasis, 'review basis');
      names(e.reviewedBy);
      const p = proposals.get(e.proposalId);
      if (!p || settled.has(e.proposalId)) throw new Error('Missing/already settled proposal');
      if (!coveredBySources(p.visibility, p.sourceRefs)) throw new Error('Visibility exceeds source access');
      const earlier = current.get(p.propositionId) ?? null;
      if (e.replaces !== earlier) throw new Error('Standing changed; explicit replacement and fresh review required');
      // In this single-current-head fixture, replacing broadly visible standing
      // with more restricted standing would make its public/workshop view vanish.
      // That disappearance reveals an otherwise hidden private event. Refuse
      // until this model has separate authorized publication tracks per audience.
      if (earlier && level(p.visibility) > level(proposals.get(earlier).visibility)) {
        throw new Error('Restricted replacement would alter a wider audience; separate publication tracks required');
      }
      current.set(p.propositionId, p.proposalId);
      withdrawals.delete(p.propositionId); // An explicit new settlement reopens the visible road.
      settled.add(p.proposalId);
    } else if (e.kind === 'challenge') {
      requireId(e.targetsProposalId, 'challenged ID');
      requireString(e.reason, 'challenge reason');
      level(e.visibility);
      sources(e.sourceRefs);
      if (!coveredBySources(e.visibility, e.sourceRefs)) throw new Error('Challenge visibility exceeds source access');
      const p = proposals.get(e.targetsProposalId);
      if (!p || current.get(p.propositionId) !== p.proposalId) throw new Error('Challenge targets stale/noncurrent standing');
      challenges.push(e);
    } else if (e.kind === 'withdraw') {
      requireId(e.targetsProposalId, 'withdrawn ID');
      requireString(e.reason, 'withdrawal reason');
      requireString(e.notice, 'audience-facing withdrawal notice');
      requireString(e.reviewBasis, 'withdrawal review basis');
      names(e.reviewedBy);
      level(e.visibility);
      sources(e.sourceRefs);
      if (!coveredBySources(e.visibility, e.sourceRefs)) throw new Error('Withdrawal visibility exceeds source access');
      const p = proposals.get(e.targetsProposalId);
      if (!p || current.get(p.propositionId) !== p.proposalId) throw new Error('Withdrawal targets stale/noncurrent standing');
      // A restricted withdrawal cannot silently remove broader published standing.
      // A withdrawal must be an explicit reviewed act at the existing audience level.
      // This is receipt validation, NOT proof of reviewer identity or authority.
      if (e.visibility !== p.visibility) throw new Error('Withdrawal audience must match current standing');
      current.delete(p.propositionId);
      withdrawals.set(p.propositionId, { event: e, proposal: p });
    } else {
      throw new Error('Unknown event kind');
    }
  }
  return { proposals, current, withdrawals, challenges };
}

// Logical compare-and-swap for a single in-memory specimen ONLY.
// This does not provide a transaction or concurrency guarantee across processes.
export function appendEvent(ledger, next, expectedGeneration) {
  replay(ledger);
  if (expectedGeneration !== ledger.generation) throw new Error('Stale generation');
  if (ledger.events.length >= maxEvents) throw new Error('Event limit');
  const candidate = structuredClone({
    schema: SCHEMA, generation: ledger.generation + 1,
    events: [...ledger.events, next]
  });
  replay(candidate);
  return candidate;
}

// Exact-topic projection only. No embeddings, topic inference, truth arbitration,
// cross-user authentication, or answer-time model checking takes place here.
export function readStanding(ledger, scopeKey, clearance) {
  requireId(scopeKey, 'query scope key');
  level(clearance); // Caller-supplied clearance is NOT an identity credential.
  const state = replay(ledger);
  const entries = [];
  for (const [propositionId, proposalId] of state.current) {
    const p = state.proposals.get(proposalId);
    if (!p.scopeKeys.includes(scopeKey) || level(p.visibility) > level(clearance)) continue;
    const pending = state.challenges.some(c =>
      c.targetsProposalId === proposalId && level(c.visibility) <= level(clearance));
    entries.push({
      propositionId, proposalId, status: 'settled', standingText: p.standingText,
      scopeKeys: [...p.scopeKeys], sourceRefs: structuredClone(p.sourceRefs),
      visibility: p.visibility, reopenWhen: p.reopenWhen,
      // Do not return global ledger generation: even a hidden private event advances
      // it and would reveal private activity to a lower-clearance reader.
      challengePending: pending
    });
  }
  for (const [propositionId, receipt] of state.withdrawals) {
    const { event: e, proposal: p } = receipt;
    if (state.current.has(propositionId) ||
        !p.scopeKeys.includes(scopeKey) ||
        level(e.visibility) > level(clearance)) continue;
    // A withdrawal is a deliberately visible review event, not a vanished entry.
    // Project only the authorized notice and source road; not private challenges,
    // internal global generation, or potentially sensitive internal review notes.
    entries.push({
      propositionId, proposalId: p.proposalId, status: 'withdrawn',
      withdrawalNotice: e.notice, scopeKeys: [...p.scopeKeys],
      sourceRefs: structuredClone(e.sourceRefs), visibility: e.visibility
    });
  }
  return entries.sort((a, b) => a.propositionId.localeCompare(b.propositionId));
}
