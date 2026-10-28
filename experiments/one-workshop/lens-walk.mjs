// One Workshop — small, pure, fictional read-only perception-lens specimen.
// No live Drive read, no user authentication, no publication, no source merging.

export const LENS_SCHEMA = 'earthlyhands.lens.v0-fixture';
const GRADES = Object.freeze({public: 0, workshop: 1, private: 2});
const NODE_KEYS = ['id', 'kind', 'label', 'access', 'identityState', 'source', 'nonclaims'];
const SOURCE_KEYS = ['fileId', 'locator', 'exactPhrase', 'eventTime', 'recordTime', 'access'];
const RELATION_KEYS = ['id', 'from', 'to', 'facet', 'verb', 'standing', 'witness', 'access'];
const WITNESS_KEYS = ['fileId', 'locator', 'role', 'access'];
const FACETS = ['spatial', 'documentary', 'comparison'];
const MAX_NODES = 1000;
const MAX_RELATIONS = 5000;

function exactShape(value, keys, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).length !== keys.length || keys.some(k => !Object.hasOwn(value, k))) {
    throw new Error(`Unsupported ${name} fields`);
  }
}
function token(value) {
  return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(value);
}
function string(value) { return typeof value === 'string' && value.trim().length > 0; }
function grade(value) {
  if (!Object.hasOwn(GRADES, value)) throw new Error('Unknown access compartment');
  return GRADES[value];
}
function proseSource(value, label) {
  exactShape(value, SOURCE_KEYS, label);
  if (!token(value.fileId) || !string(value.locator) || !string(value.exactPhrase) ||
      (value.eventTime !== null && !string(value.eventTime)) ||
      (value.recordTime !== null && !string(value.recordTime)))
    throw new Error(`Invalid ${label}`);
  grade(value.access);
}
function witness(value) {
  exactShape(value, WITNESS_KEYS, 'relation witness');
  if (!token(value.fileId) || !string(value.locator) ||
      !['source-face', 'workshop-comparison'].includes(value.role))
    throw new Error('Invalid relation witness');
  grade(value.access);
}

// A named anchor carries no fabricated source occurrence; its relations do.
// This audit establishes fixture structure and declared-access consistency,
// not real rights, source integrity, original authorship or true identity.
export function auditLensFixture(fixture) {
  exactShape(fixture, ['schema', 'nodes', 'relations'], 'lens fixture');
  if (fixture.schema !== LENS_SCHEMA || !Array.isArray(fixture.nodes) ||
      !Array.isArray(fixture.relations) || fixture.nodes.length > MAX_NODES ||
      fixture.relations.length > MAX_RELATIONS)
    throw new Error('Unsupported lens fixture or size');

  const nodes = new Map();
  for (const n of fixture.nodes) {
    exactShape(n, NODE_KEYS, 'lens node');
    if (!token(n.id) || !string(n.label) || !['occurrence', 'anchor'].includes(n.kind) ||
        nodes.has(n.id) || !Array.isArray(n.nonclaims) ||
        n.nonclaims.some(v => !string(v)))
      throw new Error('Invalid or duplicate lens node');
    const level = grade(n.access);
    if (n.kind === 'occurrence') {
      if (!['unresolved', 'distinct', 'resolved'].includes(n.identityState))
        throw new Error('Missing occurrence identity state');
      proseSource(n.source, 'occurrence source');
      if (grade(n.source.access) > level)
        throw new Error('Node is broader than its source');
    } else if (n.source !== null || n.identityState !== null) {
      throw new Error('Anchor cannot impersonate a sourced occurrence');
    }
    nodes.set(n.id, n);
  }

  const relationIds = new Set();
  for (const r of fixture.relations) {
    exactShape(r, RELATION_KEYS, 'lens relation');
    if (!token(r.id) || relationIds.has(r.id) ||
        !nodes.has(r.from) || !nodes.has(r.to) || r.from === r.to ||
        !FACETS.includes(r.facet) || !string(r.verb))
      throw new Error('Invalid, duplicate or dangling lens relation');
    witness(r.witness);
    const level = grade(r.access);
    if (level < grade(nodes.get(r.from).access) ||
        level < grade(nodes.get(r.to).access) ||
        level < grade(r.witness.access))
      throw new Error('Relation is broader than endpoint or witness');
    if ((r.facet === 'comparison' && (r.standing !== 'comparison-only' ||
          r.witness.role !== 'workshop-comparison')) ||
        (r.facet !== 'comparison' && (r.standing !== 'source-stated' ||
          r.witness.role !== 'source-face')))
      throw new Error('Comparison cannot be promoted to a source-stated join');
    relationIds.add(r.id);
  }
  return {nodes: nodes.size, relations: relationIds.size};
}

// A viewer is a TEST FIXTURE, never a credential. Authorization must be supplied
// by an external service before real use. Both graph traversal and output
// operate only on the already filtered subgraph; hidden intermediate nodes,
// relations and witnesses cannot create visible paths or reported totals.
export function walkLens(fixture, {center, depth = 1, viewer = 'public', facets = FACETS} = {}) {
  auditLensFixture(fixture);
  const permitted = grade(viewer);
  if (!Number.isSafeInteger(depth) || depth < 0 || depth > 3)
    throw new Error('Lens depth must be 0 through 3');
  if (!Array.isArray(facets) || facets.some(f => !FACETS.includes(f)) ||
      new Set(facets).size !== facets.length)
    throw new Error('Unsupported lens facets');

  const allowedNodes = new Map(fixture.nodes
    .filter(n => grade(n.access) <= permitted)
    .map(n => [n.id, n]));
  // Identical message for absent and concealed centers.
  if (!allowedNodes.has(center)) throw new Error('Focus not available');
  const selected = new Set(facets);
  const allowedRelations = fixture.relations.filter(r =>
    selected.has(r.facet) && grade(r.access) <= permitted &&
    grade(r.witness.access) <= permitted &&
    allowedNodes.has(r.from) && allowedNodes.has(r.to));

  const adjacency = new Map([...allowedNodes.keys()].map(id => [id, []]));
  for (const r of allowedRelations) {
    adjacency.get(r.from).push(r.to);
    adjacency.get(r.to).push(r.from); // navigation only; verb direction is unchanged
  }
  const distances = new Map([[center, 0]]);
  const queue = [center];
  for (let i = 0; i < queue.length; i++) {
    const at = queue[i], d = distances.get(at);
    if (d >= depth) continue;
    for (const other of adjacency.get(at)) {
      if (!distances.has(other)) { distances.set(other, d + 1); queue.push(other); }
    }
  }
  const visible = new Set(distances.keys());
  // Original edge orientation and primary/source vs workshop-comparison status
  // stay attached. A two-hop path does NOT create a new inferred relation.
  const result = {
    schema: LENS_SCHEMA,
    view: {center, depth, facets: [...facets], viewerIsOnlyAFixture: true},
    nodes: fixture.nodes.filter(n => visible.has(n.id))
      .map(n => ({...structuredClone(n), distance: distances.get(n.id)})),
    relations: allowedRelations.filter(r => visible.has(r.from) && visible.has(r.to))
      .map(r => structuredClone(r)),
  };
  return result;
}
