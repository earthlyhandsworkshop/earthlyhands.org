import { PRIVATE_CONSTELLATIONS } from './registry.mjs';

const FOLIO_ORIGIN = 'https://earthly-hands-listening-ground.workshop-1a6.workers.dev';
const PREFIX = '/folio/workshop/constellations/';
const SLUG = /^[a-z0-9][a-z0-9_-]{2,77}$/;
const HASH = /^[0-9a-f]{64}$/;
const MAX = 48;

function reply(payload, status) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
    },
  });
}
const deny = (code, status = 403) => reply({ code, error: code }, status);

async function folioMember(env, ctx) {
  if (!env?.RECEIVING_DB || !ctx?.access?.getIdentity ||
      !String(env.FOLIO_ALLOWED_EMAILS || '').trim()) return false;
  let identity;
  try { identity = await ctx.access.getIdentity(); } catch { return false; }
  const email = String(identity?.email || '').trim().toLowerCase();
  if (!email || !String(env.FOLIO_ALLOWED_EMAILS).split(',').map(s => s.trim().toLowerCase()).includes(email)) return false;
  let configured;
  try { configured = JSON.parse(String(env.FOLIO_RELATIONSHIPS_JSON || '')); }
  catch { return false; }
  const mapped = configured?.[email];
  if (!mapped || typeof mapped !== 'object') return false;
  const id = String(mapped.id || '').trim().toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, '-').slice(0, 80);
  if (!id || !String(mapped.name || mapped.id || '').trim()) return false;
  const raw = String(identity.user_uuid || identity.id || identity.sub || identity.email || '').trim();
  if (!raw) return false;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
  // An ordinary reader may not create or reactivate a membership.
  const row = await env.RECEIVING_DB.prepare(
    'SELECT active FROM folio_memberships WHERE relationship_id=? AND subject_hash=?'
  ).bind(id, hash).first();
  return Number(row?.active || 0) === 1;
}

function nativeRoad(slug, road) {
  if (!SLUG.test(String(slug || ''))) return false;
  try {
    const url = new URL(road);
    return url.origin === FOLIO_ORIGIN &&
      url.href === road &&
      url.pathname === '/folio/workshop/native/' + slug &&
      !url.search && !url.hash && !url.username && !url.password;
  } catch { return false; }
}

export function verifiedWorks(rows) {
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > MAX) return null;
  const ordinals = new Set(), slugs = new Set(), works = [];
  for (const r of rows) {
    const order = Number(r.ordinal);
    if (!Number.isInteger(order) || order < 1 || order > MAX ||
        ordinals.has(order) || slugs.has(r.slug) ||
        !r.title || !r.maker || !r.curatorial_role || !r.version_label ||
        !HASH.test(String(r.sha256 || '')) ||
        !nativeRoad(r.slug, r.protected_reader_road) ||
        r.state !== 'private_approved' ||
        r.audience !== 'existing_folio_members' ||
        (r.effective_visibility != null && r.effective_visibility !== 'private') ||
        (r.edition_sha256 != null && r.edition_sha256 !== r.sha256)) return null;
    ordinals.add(order); slugs.add(r.slug);
    works.push({
      ordinal: order, role: String(r.curatorial_role), slug: String(r.slug),
      title: String(r.title), maker: String(r.maker),
      edition: String(r.version_label), read_url: String(r.protected_reader_road),
    });
  }
  works.sort((a, b) => a.ordinal - b.ordinal);
  return works.some((x, i) => x.ordinal !== i + 1) ? null : works;
}

/**
 * One of the site's common services. It deliberately does not render a maker's
 * original work, rewrite an interpretation, or grant public access.
 * A trusted private registry supplies an explicitly reviewed SQL SELECT.
 */
export async function serveConstellationManifest(request, env, ctx, { registry = PRIVATE_CONSTELLATIONS } = {}) {
  const url = new URL(request.url);
  if (url.origin !== FOLIO_ORIGIN || !url.pathname.startsWith(PREFIX)) return null;
  if (request.method !== 'GET') return deny('method_not_allowed', 405);
  const suffix = '/manifest.json';
  const rest = url.pathname.slice(PREFIX.length);
  if (!rest.endsWith(suffix) || url.search || url.hash) return deny('not_found', 404);
  const slug = rest.slice(0, -suffix.length);
  if (!/^[a-z0-9][a-z0-9-]{2,75}$/.test(slug)) return deny('not_found', 404);
  const source = Object.hasOwn(registry, slug) ? registry[slug] : null;
  if (!source || source.audience !== 'existing_folio_members') return deny('not_found', 404);
  try {
    if (!await folioMember(env, ctx)) return deny('private_folio_access_required');
  } catch { return deny('membership_check_failed', 503); }
  if (!source.members_sql || !env?.RECEIVING_DB) return deny('source_unavailable', 503);
  let rows;
  try {
    const result = await env.RECEIVING_DB.prepare(source.members_sql).all();
    rows = result?.results;
  } catch { return deny('source_unavailable', 503); }
  const works = verifiedWorks(rows);
  if (!works) return deny('constellation_not_verified', 503);
  return reply({
    schema: 'earthly-hands:private-constellation-manifest:v1',
    kind: 'constellation',
    slug, title: source.title, curator: source.curator,
    question: source.question, description: source.description,
    source_view: source.source_view,
    state: 'private_provisional_not_public',
    audience: 'existing_folio_members',
    no_historical_identity_join_implied: true,
    works,
  }, 200);
}