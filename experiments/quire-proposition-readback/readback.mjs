/**
 * Quire — isolated proposition-facing readback specimen.
 *
 * This module does not talk to Cloudflare or Google Drive. Its inputs are
 * normalized records supplied by a trusted, authenticated, source-backed
 * adapter. It never decides source authority from recency, action kind, or
 * a companion's label. No database mutations or publication routes exist.
 *
 * In particular, a permission-bounded view is NEVER a claim about the
 * population of objects outside that view.
 */

const DEFAULT_PAGE_SIZE = 30;
const MAX_PAGE_SIZE = 30;
const EXPLANATION = 'This is a permission-bounded view of attributable observations, not a finding of source or institutional authority. An item absent from this view may exist outside your access.';

function validOrdinal(v) {
  return Number.isSafeInteger(v) && v > 0;
}

function requireArray(value, name) {
  if (!Array.isArray(value)) throw new TypeError(`${name} must be an array`);
}

function asText(value) {
  return typeof value === 'string' ? value : '';
}

function validPageSize(n) {
  if (!Number.isSafeInteger(n) || n < 1 || n > MAX_PAGE_SIZE) throw new RangeError('page size must be between 1 and 30');
  return n;
}

// The cursor must preserve EVERY stable sort key, not only proposition_ordinal.
function nextBeforeCursor(beforeByProposition, propositionKey) {
  const x = beforeByProposition?.[propositionKey];
  if (x === undefined) return null;
  if (!x || typeof x !== 'object' || Array.isArray(x) ||
      !validOrdinal(x.proposition_ordinal) || !validOrdinal(x.event_ordinal) ||
      !asText(x.event_id)) throw new RangeError('invalid pagination cursor');
  return { proposition_ordinal: x.proposition_ordinal, event_ordinal: x.event_ordinal, event_id: x.event_id };
}

// Descending, deterministic order. An event ID disambiguates equal ordinals.
function readingOrder(a, b) {
  if (a.proposition_ordinal !== b.proposition_ordinal) return a.proposition_ordinal < b.proposition_ordinal ? 1 : -1;
  if (a.event_ordinal !== b.event_ordinal) return a.event_ordinal < b.event_ordinal ? 1 : -1;
  return a.event_id === b.event_id ? 0 : a.event_id < b.event_id ? 1 : -1;
}

function cursorOf(reading) {
  return { proposition_ordinal: reading.proposition_ordinal, event_ordinal: reading.event_ordinal, event_id: reading.event_id };
}

/**
 * Inspect a normalized projection internally. NEVER return this diagnostic
 * to a restricted reader, because IDs or counts may reveal unseen objects.
 */
export function auditCoverage({ events, mappings }) {
  requireArray(events, 'events');
  requireArray(mappings, 'mappings');
  const existing = new Set(events.map(e => e.event_id));
  const mapped = new Set();
  const duplicates = new Set();
  const orphanMappings = [];
  for (const m of mappings) {
    if (!existing.has(m.event_id)) orphanMappings.push(m.event_id);
    if (mapped.has(m.event_id)) duplicates.add(m.event_id);
    mapped.add(m.event_id);
  }
  return {
    eventCount: events.length,
    mappingCount: mappings.length,
    unmappedEventIds: events.filter(e => !mapped.has(e.event_id)).map(e => e.event_id),
    duplicateMappingEventIds: [...duplicates],
    orphanMappingEventIds: orphanMappings
  };
}

/**
 * The event permission callback MUST be supplied by a trusted server-side
 * policy decision after authenticated identity has been verified. Neither
 * client-supplied labels nor request parameters may implement this policy.
 *
 * Normalized event: event_id, event_ordinal, maker, evidence_scope,
 * observation, evidence_road, authority_limit, observed_at.
 * Normalized mapping: event_id, proposition_key, proposition_ordinal,
 * relation_role. This is a projection contract, NOT a claim that the current
 * D1 column names match it. An adapter must be verified against live schema.
 */
export function projectForReader(snapshot, policy) {
  const { events, mappings, jacket } = snapshot ?? {};
  requireArray(events, 'events');
  requireArray(mappings, 'mappings');
  if (typeof policy?.canSeeEvent !== 'function') throw new TypeError('trusted event permission predicate required');
  const pageSize = validPageSize(policy.pageSize ?? DEFAULT_PAGE_SIZE);
  const byId = new Map(events.filter(e => policy.canSeeEvent(e) === true).map(e => [e.event_id, e]));
  const groups = new Map();
  for (const m of mappings) {
    const event = byId.get(m.event_id);
    if (!event) continue;
    if (!asText(m.proposition_key) || !validOrdinal(m.proposition_ordinal)) continue;
    if (!groups.has(m.proposition_key)) groups.set(m.proposition_key, []);
    groups.get(m.proposition_key).push({
      event_id: event.event_id,
      event_ordinal: event.event_ordinal,
      proposition_ordinal: m.proposition_ordinal,
      relation_role: asText(m.relation_role),
      maker: asText(event.maker),
      observed_at: asText(event.observed_at),
      observation: asText(event.observation),
      evidence_scope: asText(event.evidence_scope),
      evidence_road: asText(event.evidence_road),
      authority_limit: asText(event.authority_limit)
    });
  }
  const propositions = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, readings]) => {
    readings.sort(readingOrder);
    // Duplicate visible tuples cannot be paged losslessly; refuse, never skip.
    for (let i = 1; i < readings.length; i++) {
      if (readingOrder(readings[i - 1], readings[i]) === 0) throw new TypeError('duplicate visible pagination key');
    }
    const cursor = nextBeforeCursor(policy.beforeByProposition, key);
    const reachable = cursor === null ? readings : readings.filter(r => readingOrder(r, cursor) > 0);
    const page = reachable.slice(0, pageSize);
    return {
      proposition_key: key,
      latest_accessible: cursor === null ? (readings[0] ?? null) : null,
      // This is a local, access-bounded page, never an overall population count.
      readings: page,
      older_before_cursor: reachable.length > pageSize ? cursorOf(page.at(-1)) : null
    };
  });
  const visible = propositions.filter(p => p.readings.length > 0);
  return {
    kind: 'quire-proposition-readback-v0',
    explanation: EXPLANATION,
    jacket: visible.length && policy.canSeeJacket === true && jacket
      ? { title: asText(jacket.title), url: asText(jacket.url), custody: 'governing-source-jacket-separate-from-interface' }
      : null,
    propositions: visible
  };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function safeJacketUrl(raw) {
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' ? u.toString() : null;
  } catch { return null; }
}

export function renderHtml(view) {
  const sections = view.propositions.map(p => {
    const rows = p.readings.map((r, i) => `<article class="reading"><h3>${i === 0 && p.latest_accessible ? 'Latest accessible reading' : 'Earlier accessible reading'} · proposition ${r.proposition_ordinal}</h3><p>${escapeHtml(r.observation)}</p><p class="meta">${escapeHtml(r.maker)} · ${escapeHtml(r.observed_at)} · ${escapeHtml(r.relation_role)} · ${escapeHtml(r.evidence_scope)}</p><p><strong>Evidence road:</strong> ${escapeHtml(r.evidence_road)}</p><p><strong>Authority limit:</strong> ${escapeHtml(r.authority_limit)}</p></article>`).join('');
    const earlier = p.older_before_cursor === null ? '' : '<p class="meta">Earlier accessible readings can be requested with this proposition\'s returned cursor. No claim is made about records outside this access view.</p>';
    return `<section><h2>${escapeHtml(p.proposition_key)}</h2>${rows}${earlier}</section>`;
  }).join('');
  const link = view.jacket ? safeJacketUrl(view.jacket.url) : null;
  const jacket = view.jacket ? `<aside><h2>Governing source jacket — separate from this display</h2>${link ? `<a href="${escapeHtml(link)}" rel="noreferrer">${escapeHtml(view.jacket.title)}</a>` : `<p>${escapeHtml(view.jacket.title)}</p>`}</aside>` : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Quire · proposition readback (fixture)</title><style>body{font:1rem/1.55 system-ui,sans-serif;max-width:58rem;margin:auto;padding:1.5rem;color:#272c2a;background:#f7f4ed}h1,h2{font-family:Georgia,serif}section,aside{border-top:1px solid #b9b4a7;margin-top:1.5rem;padding-top:1rem}.reading{padding:.5rem 0 1rem;border-bottom:1px solid #ddd}.meta{color:#595e5a;font-size:.85rem}p{overflow-wrap:anywhere}</style></head><body><h1>One source, several propositions</h1><p>${escapeHtml(view.explanation)}</p>${jacket}${sections}<footer><p>Attributable readings are not automatically settled authority. Source custody has not moved.</p></footer></body></html>`;
}

function response(body, status, html = false) {
  return new Response(html ? body : JSON.stringify(body), {
    status,
    headers: {
      'content-type': html ? 'text/html; charset=utf-8' : 'application/json; charset=utf-8',
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
      'x-robots-tag': 'noindex, nofollow',
      'referrer-policy': 'no-referrer'
    }
  });
}

/**
 * Example integration boundary: a trusted server must provide a verified
 * Access identity AND an authorized set of event IDs. Verifying an email
 * string or CORS/Origin is NOT sufficient. Nothing here validates a JWT.
 * No non-GET path exists, but this does not certify other Worker routes.
 */
export async function handleReadback(request, { authorize, loadSnapshot, representation = 'json' } = {}) {
  if (typeof authorize !== 'function' || typeof loadSnapshot !== 'function') {
    return response({ error: 'server_policy_unavailable' }, 503);
  }
  let grant;
  try { grant = await authorize(request); } catch { return response({ error: 'forbidden' }, 403); }
  if (grant?.verified !== true || grant?.canRead !== true || !Array.isArray(grant.allowedEventIds)) {
    return response({ error: 'forbidden' }, 403);
  }
  if (request.method !== 'GET') return response({ error: 'method_not_allowed' }, 405);
  try {
    const snapshot = await loadSnapshot(grant);
    const allow = new Set(grant.allowedEventIds);
    const view = projectForReader(snapshot, {
      canSeeEvent: e => allow.has(e.event_id),
      canSeeJacket: grant.canSeeJacket === true,
      pageSize: DEFAULT_PAGE_SIZE
    });
    return representation === 'html' ? response(renderHtml(view), 200, true) : response(view, 200);
  } catch {
    return response({ error: 'readback_unavailable' }, 503);
  }
}
