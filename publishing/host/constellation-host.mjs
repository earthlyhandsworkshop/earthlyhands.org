import { PRIVATE_CONSTELLATIONS } from './registry.mjs';

/**
 * Earthly Hands · bounded, authenticated shared constellation hosting service.
 * The renderer is infrastructure: it does not adopt the maker's underlying work.
 * It is NOT the public release service. The current Folio and Cloudflare Pages
 * sources must be reconciled before this is mounted on a live route.
 */
const BASE = '/folio/workshop/constellations/';
const MAX_MEMBERS = 48;
const SLUG = /^[a-z0-9][a-z0-9_-]{2,77}$/;
const SHA = /^[0-9a-f]{64}$/;
const FOLIO_ORIGIN = 'https://earthly-hands-listening-ground.workshop-1a6.workers.dev';
const MAX_TEXT = { title: 220, maker: 360, role: 110, edition: 180 };

// An adapter's statement is trusted source code, never visitor input. This
// conservative guard nevertheless rejects accidental writes and multi-query
// statements before they reach D1. Review the referenced view separately.
export function boundedReadOnlySql(value) {
  if (typeof value !== 'string' || value.length > 2400) return false;
  const sql = value.trim();
  return sql.length > 0 && sql.length <= 2400 &&
    /^SELECT\s/i.test(sql) &&
    !/[;]|--|\/\*|\*\//.test(sql) &&
    !/\b(?:INSERT|UPDATE|DELETE|REPLACE|CREATE|DROP|ALTER|ATTACH|DETACH|PRAGMA|VACUUM|TRIGGER|RETURNING)\b/i.test(sql);
}

function shortVisible(value, max) {
  return typeof value === 'string' &&
    value.trim().length > 0 && value.length <= max &&
    !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value);
}

function fail(status, code) {
  return response(JSON.stringify({ error: code, code }), status, 'application/json; charset=utf-8');
}
function response(body, status, type) {
  return new Response(body, { status, headers: {
    'Content-Type': type,
    'Cache-Control': 'private, no-store',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'",
  } });
}
const htmlText = (x) => String(x ?? '').replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

async function subjectHash(identity) {
  // Matches the existing Folio's *stable* subject-hash algorithm.
  const raw = String(identity?.user_uuid || identity?.id || identity?.sub || identity?.email || '').trim();
  if (!raw) return '';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

async function privateMembership(env, ctx) {
  if (!ctx?.access?.getIdentity) return false;
  if (!env?.RECEIVING_DB || !String(env.FOLIO_ALLOWED_EMAILS || '').trim()) return false;
  let identity;
  try { identity = await ctx.access.getIdentity(); } catch { return false; }
  const email = String(identity?.email || '').trim().toLowerCase();
  if (!email || !String(env.FOLIO_ALLOWED_EMAILS).split(',')
    .map(x => x.trim().toLowerCase()).includes(email)) return false;
  let relationships;
  try { relationships = JSON.parse(String(env.FOLIO_RELATIONSHIPS_JSON || '')); }
  catch { return false; }
  const mapped = relationships?.[email];
  if (!mapped || typeof mapped !== 'object') return false;
  const id = String(mapped.id || '').trim().toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, '-').slice(0, 80);
  if (!id || !String(mapped.name || mapped.id || '').trim()) return false;
  const hash = await subjectHash(identity);
  if (!hash) return false;
  // No membership creation/reactivation on an ordinary read.
  const member = await env.RECEIVING_DB.prepare(
    'SELECT active FROM folio_memberships WHERE relationship_id=? AND subject_hash=?'
  ).bind(id, hash).first();
  return Number(member?.active || 0) === 1;
}

function memberReader(slug, url) {
  if (!SLUG.test(slug)) return false;
  try {
    const parsed = new URL(url);
    return parsed.origin === FOLIO_ORIGIN && parsed.href === url &&
      parsed.pathname === `/folio/workshop/native/${slug}` &&
      !parsed.search && !parsed.hash && !parsed.username && !parsed.password;
  } catch { return false; }
}

/** Rejects (rather than silently hiding) changed, inaccessible or ambiguous membership. */
export function validateMembers(rows) {
  if (!Array.isArray(rows) || !rows.length || rows.length > MAX_MEMBERS) return null;
  const slugs = new Set();
  const ordinals = new Set();
  const list = [];
  for (const r of rows) {
    const ordinal = Number(r.ordinal);
    if (!Number.isInteger(ordinal) || ordinal < 1 || ordinal > MAX_MEMBERS ||
        ordinals.has(ordinal) || slugs.has(r.slug) ||
        !SLUG.test(String(r.slug || '')) ||
        !shortVisible(r.title, MAX_TEXT.title) ||
        !shortVisible(r.maker, MAX_TEXT.maker) ||
        !shortVisible(r.curatorial_role, MAX_TEXT.role) ||
        !shortVisible(r.version_label, MAX_TEXT.edition) ||
        !SHA.test(String(r.sha256 || '')) || !memberReader(r.slug, r.protected_reader_road) ||
        r.state !== 'private_approved' || r.audience !== 'existing_folio_members' ||
        (r.effective_visibility != null && r.effective_visibility !== 'private') ||
        (r.edition_sha256 != null && r.edition_sha256 !== r.sha256)) return null;
    ordinals.add(ordinal); slugs.add(r.slug);
    list.push({
      ordinal, role: String(r.curatorial_role), slug: r.slug,
      title: String(r.title), maker: String(r.maker),
      edition: String(r.version_label),
      // A stable, exact-edition comparator for authorized returners and readers.
      // A title or an ordinal is not a version identifier.
      edition_sha256: String(r.sha256),
      read_url: r.protected_reader_road,
    });
  }
  list.sort((a, b) => a.ordinal - b.ordinal);
  if (list.some((r, i) => r.ordinal !== i + 1)) return null;
  return list;
}

function htmlPage(manifest) {
  const cards = manifest.works.map(w => `<li class="work"><div class="num">${w.ordinal.toString().padStart(2, '0')}</div><div><p class="role">${htmlText(w.role)}</p><h3>${htmlText(w.title)}</h3><p class="credit">Maker: ${htmlText(w.maker)}</p><p class="edition">${htmlText(w.edition)}</p><a class="open" href="${htmlText(w.read_url)}">Read the protected work <span aria-hidden="true">↗</span></a></div></li>`).join('\n');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>${htmlText(manifest.title)} · Earthly Hands Workshop</title><style>
:root{--paper:#f3f0e8;--ink:#1d352c;--muted:#53675a;--line:#bac8bc;--rust:#96583e}*{box-sizing:border-box}html{background:var(--paper)}body{margin:0;color:var(--ink);background:var(--paper);font:19px/1.57 Georgia,serif}a{color:#145d4a;text-underline-offset:4px}a:focus-visible{outline:3px solid var(--rust);outline-offset:4px}.skip{position:absolute;left:1rem;top:-6rem;background:var(--ink);color:#fff;padding:.6rem 1rem;font:15px system-ui,sans-serif;z-index:2}.skip:focus{top:1rem}.wrap{max-width:1120px;padding:0 22px;margin:auto}header,footer{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:18px 0;border-bottom:1px solid var(--ink);font:14px system-ui,sans-serif}.hero{padding:clamp(48px,9vw,96px) 0;border-bottom:1px solid var(--ink)}.eyebrow,.role{font:650 12px/1.45 system-ui,sans-serif;color:#4c6858;letter-spacing:.12em;text-transform:uppercase}.hero h1{font-size:clamp(3.2rem,8vw,7.2rem);line-height:.96;letter-spacing:-.06em;font-weight:400;max-width:15ch;margin:14px 0}.lead{font-size:clamp(1.3rem,2.6vw,1.85rem);line-height:1.35;max-width:660px}.caution{max-width:720px;color:var(--muted);font-size:17px}.grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.8fr);gap:clamp(22px,5vw,70px);padding:46px 0}.intro h2{font-weight:400;font-size:clamp(2rem,4vw,3.4rem);letter-spacing:-.04em;line-height:1.05;margin:10px 0 20px}.intro p{font-size:17px}.important{border-top:1px solid var(--line);padding-top:18px}.works{padding:0;margin:0;list-style:none;border-top:2px solid var(--ink)}.work{display:grid;grid-template-columns:30px 1fr;gap:16px;padding:23px 0;border-bottom:1px solid var(--line)}.num{font:14px system-ui,sans-serif;color:var(--rust)}.work h3{font-size:clamp(1.45rem,3vw,1.95rem);line-height:1.13;letter-spacing:-.035em;font-weight:400;margin:6px 0 12px}.credit,.edition{font:14px/1.45 system-ui,sans-serif;color:var(--muted);margin:6px 0}.open{display:inline-block;font:600 15px system-ui,sans-serif;margin-top:12px}.respond{border:1px solid var(--line);background:#fffdf7;padding:24px;margin-bottom:35px}.respond h2{font-size:2rem;font-weight:400;margin:10px 0}.respond p{font-size:17px;max-width:700px}footer{font-size:12px;color:var(--muted);border-top:1px solid var(--ink);border-bottom:0}@media(max-width:740px){.grid{grid-template-columns:1fr;gap:20px}.wrap{padding:0 16px}.hero{padding:40px 0}.work{grid-template-columns:25px 1fr;gap:12px}}
</style></head><body><a class="skip" href="#member-works">Skip to the works</a><div class="wrap"><header><a href="/folio/">Earthly Hands Workshop</a><a href="/folio/">Protected Folio</a></header><main><section class="hero"><p class="eyebrow">Private constellation · Curated original works · Visitor 01</p><h1>${htmlText(manifest.title)}</h1><p class="lead">${htmlText(manifest.question)}</p><p class="caution">This is a protected working constellation, not a published identity finding. The original makers own their works. Shared proximity does not prove people or documents are identical.</p></section><div class="grid"><section class="intro"><p class="eyebrow">A place to stand</p><h2>One question.<br>Many ways in.</h2><p>${htmlText(manifest.description)}</p><p class="important">The curator's selection is preserved; this host supplies only identity, navigation, credit and return. Each work keeps its own form, source roads and privacy gates.</p><p class="edition">Curator: ${htmlText(manifest.curator)}</p></section><section id="member-works" tabindex="-1" aria-label="Independently made works"><ol class="works">${cards}</ol></section></div><section class="respond"><p class="eyebrow">Receiving · not automatic submission</p><h2>Know another record?</h2><p>A question or correction can be discussed with the Workshop. Email drafts are not evidence receipts. Do not send private family material without discussing consent and custody first.</p><a href="mailto:workshop@earthlyhands.org?subject=${encodeURIComponent(manifest.title)}">Compose a message about this question ↗</a></section></main><footer><span>${htmlText(manifest.curator)} · Independent works retain original makers</span><span>Existing Folio members · No public release</span></footer></div></body></html>`;
}

export async function servePrivateConstellation(request, env, ctx, { registry = PRIVATE_CONSTELLATIONS } = {}) {
  const url = new URL(request.url);
  if (url.origin !== FOLIO_ORIGIN) return null; // Not the protected host origin.
  if (!url.pathname.startsWith(BASE)) return null; // Not our route.
  if (request.method !== 'GET') return fail(405, 'method_not_allowed');
  const remainder = url.pathname.slice(BASE.length);
  const isManifest = remainder.endsWith('/manifest.json');
  const slug = isManifest ? remainder.slice(0, -'/manifest.json'.length) : remainder.replace(/\/$/, '');
  const expected = `${BASE}${slug}/`;
  if (!/^[a-z0-9][a-z0-9-]{2,75}$/.test(slug) ||
      (!isManifest && url.pathname !== expected) || url.search || url.hash) return fail(404, 'not_found');
  // Never allow a visitor-supplied query/table name to reach SQL.
  const source = Object.hasOwn(registry, slug) ? registry[slug] : null;
  if (!source || source.audience !== 'existing_folio_members') return fail(404, 'not_found');
  try {
    if (!(await privateMembership(env, ctx))) return fail(403, 'private_folio_access_required');
  } catch { return fail(503, 'private_membership_check_failed'); }
  const sql = source.members_sql;
  if (!boundedReadOnlySql(sql) || !env?.RECEIVING_DB) return fail(503, 'source_unavailable');
  let rows;
  try { ({ results: rows } = await env.RECEIVING_DB.prepare(sql).all()); }
  catch { return fail(503, 'source_unavailable'); }
  const works = validateMembers(rows);
  if (!works) return fail(503, 'constellation_not_verified');
  const manifest = {
    kind: 'constellation', schema: 'earthly-hands:private-host:v1',
    slug: source.slug, title: source.title, question: source.question,
    curator: source.curator, description: source.description,
    state: 'private_provisional_not_public', audience: 'existing_folio_members',
    source_view: source.source_view,
    // Not an editorial approval, a source reading, or a public release receipt.
    no_identity_join_implied: true,
    works,
  };
  return isManifest
    ? response(JSON.stringify(manifest), 200, 'application/json; charset=utf-8')
    : response(htmlPage(manifest), 200, 'text/html; charset=utf-8');
}
