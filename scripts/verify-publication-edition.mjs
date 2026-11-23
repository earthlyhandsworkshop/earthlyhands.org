/**
 * Earthly Hands — exact-edition integrity instrument, v1.
 *
 * Reads an existing release manifest (Glean's `current_html`/`current_source`
 * or True North's `public_assets`) and separately supplied exact R2 object bytes.
 * This is an *inspection* instrument, never a publication authority.
 * It performs no network calls, permissions changes, or publishing writes.
 *
 *   node scripts/verify-publication-edition.mjs --manifest receipt.json --objects ./r2-copy
 *
 * The objects directory mirrors R2 keys. Never put private originals or
 * credentials in a public repository just to run this instrument.
 */
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve, relative, isAbsolute, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const HEX64 = /^[a-f0-9]{64}$/;
const empty = (value) => typeof value !== 'string' || !value.trim();

export function normalizedAssets(manifest) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new Error('Release manifest must be a JSON object');
  }
  if (Array.isArray(manifest.public_assets)) {
    if (!manifest.public_assets.length) throw new Error('public_assets is empty');
    return manifest.public_assets.map((a, i) => ({
      label: a.name || `asset_${i}`,
      key: a.key,
      expectedSha: a.sha,
      expectedBytes: a.bytes,
      contentType: a.type || '',
    }));
  }
  if (manifest.current_html && manifest.current_source) {
    return [
      { label: 'page', key: manifest.current_html.key, expectedSha: manifest.current_html.sha256, expectedBytes: manifest.current_html.bytes, contentType: 'text/html' },
      { label: 'source', key: manifest.current_source.key, expectedSha: manifest.current_source.sha256, expectedBytes: manifest.current_source.bytes, contentType: 'text/markdown' },
    ];
  }
  throw new Error('Unsupported receipt: expected public_assets or current_html/current_source');
}

export function safeR2Key(key) {
  if (empty(key) || isAbsolute(key) || key.startsWith('/') || key.includes('\\')) return false;
  if (!/^[a-zA-Z0-9._\/-]+$/.test(key)) return false;
  return key.split('/').every(part => part !== '' && part !== '.' && part !== '..');
}

export function toSafeLocalPath(root, key) {
  if (!safeR2Key(key)) throw new Error('Unsafe R2 object key');
  const parent = resolve(root), dest = resolve(parent, key);
  const rel = relative(parent, dest);
  if (!rel || rel.startsWith('..' + sep) || rel === '..' || isAbsolute(rel)) throw new Error('R2 key escapes local root');
  return dest;
}

function uniqueStrings(values) {
  return [...new Set(values)];
}

function browserStructure(html, sourcePublicUrl, canonicalPublicUrl) {
  const issues = [];
  const have = (re, issue) => { if (!re.test(html)) issues.push(issue); };
  have(/<!doctype\s+html\s*>/i, 'missing_html_doctype');
  have(/<html\b[^>]*\blang=["'][a-z][a-z-]*["']/i, 'missing_html_language');
  have(/<meta\b[^>]*\bname=["']viewport["']/i, 'missing_mobile_viewport');
  have(/<main\b/i, 'missing_main_landmark');
  have(/<h1\b/i, 'missing_h1');
  have(/<title\b[^>]*>[^<]+<\/title>/i, 'missing_document_title');
  const canonicalTag = [...html.matchAll(/<link\b[^>]*>/gi)].map(x => x[0])
    .find(s => /\brel=["']canonical["']/i.test(s));
  const renderedCanonical = canonicalTag?.match(/\bhref=["']([^"']+)["']/i)?.[1] || null;
  if (!renderedCanonical) issues.push('missing_stable_canonical_address');
  if (canonicalPublicUrl && renderedCanonical && renderedCanonical !== canonicalPublicUrl) {
    issues.push('canonical_url_does_not_match_release_receipt');
  }
  const links = [...html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi)]
    .map(m => m[1].replaceAll('&amp;', '&'));
  const sourceLinks = links.filter(s => /(?:^|\/)(?:source\.md|source\.html)(?:[?#]|$)/i.test(s));
  if (!sourceLinks.length) issues.push('missing_source_reading_link');
  const replies = links.filter(s => s.startsWith('mailto:'));
  if (!replies.length) issues.push('missing_contact_link');
  const contextual = replies.some(s => /[?&]subject=/i.test(s) || /[?&]body=/i.test(s));
  if (!contextual) issues.push('contact_is_not_page_specific');
  if (links.some(s => /^(javascript|data):/i.test(s))) issues.push('unsafe_link_protocol');
  if (sourcePublicUrl && !links.includes(sourcePublicUrl) && !links.some(s => s.endsWith('/source.md'))) {
    issues.push('documented_source_url_not_linked');
  }
  return { issues, linkCount: links.length, sourceLinks, contextualReply: contextual };
}

export async function verifyPublicationEdition(manifest, readObject) {
  const assets = normalizedAssets(manifest), seenKeys = new Set();
  const errors = [], warnings = [];
  let html = null;
  for (const a of assets) {
    if (!safeR2Key(a.key)) { errors.push(`${a.label}:unsafe_object_key`); continue; }
    if (seenKeys.has(a.key)) { errors.push(`${a.label}:duplicate_object_key`); continue; }
    seenKeys.add(a.key);
    if (!HEX64.test(a.expectedSha || '')) { errors.push(`${a.label}:missing_or_invalid_sha256`); continue; }
    if (!Number.isSafeInteger(a.expectedBytes) || a.expectedBytes < 1) { errors.push(`${a.label}:missing_or_invalid_byte_length`); continue; }
    let bytes;
    try { bytes = await readObject(a.key); }
    catch { errors.push(`${a.label}:object_unavailable`); continue; }
    if (!Buffer.isBuffer(bytes)) bytes = Buffer.from(bytes);
    if (bytes.byteLength !== a.expectedBytes) errors.push(`${a.label}:byte_length_mismatch`);
    const digest = createHash('sha256').update(bytes).digest('hex');
    if (digest !== a.expectedSha) errors.push(`${a.label}:sha256_mismatch`);
    const embedded = a.key.match(/(?:^|\/)sha256-([a-f0-9]{64})(?:\/|$)/);
    if (embedded && embedded[1] !== a.expectedSha) errors.push(`${a.label}:r2_key_sha_disagrees_with_manifest`);
    if (/text\/html/i.test(a.contentType) || /(?:index|page|roof|making)\.html$/i.test(a.key)) {
      if (a.label === 'page' || a.label === 'index' || a.label === 'html') html = bytes.toString('utf8');
    }
  }
  if (!assets.some(a => a.label === 'source')) {
    warnings.push('source_asset_not_named_source__check_manifest_scope');
  }
  const claimedPublic = manifest.public_state || manifest.permissions || null;
  if (html) {
    const a = browserStructure(html, manifest.public_source_url || null, manifest.canonical_public_url || null);
    errors.push(...a.issues.map(x => `page:${x}`));
  } else {
    warnings.push('primary_page_structure_not_inspected');
  }
  // This instrument does NOT check whether source links resolve, who owns rights,
  // whether a reviewer signed off, whether the browser actually rendered,
  // whether a message was received, or what the historical record proves.
  return {
    instrument: 'earthly-hands-exact-edition-proof/v1',
    status: errors.length ? 'technical_hold' : 'technical_bytes_and_structure_pass',
    publication_authorized: false,
    assets_examined: assets.length,
    errors: uniqueStrings(errors), warnings: uniqueStrings(warnings),
    review_still_required: [
      'original_source_next_click_in_real_public_browser',
      'maker_credit_and_external_rights_permission',
      'independent_editorial_and_source_claim_review',
      'public_and_denied_access_acceptance',
      'real_mobile_browser_and_accessibility',
      'page_specific_reply_delivery_and_return',
      'stable_address_public_bytes_and_reversible_release',
    ],
    receipt_claim_not_reverified: claimedPublic,
  };
}

async function main() {
  const argv = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < argv.length; i += 2) opts[argv[i]] = argv[i + 1];
  if (!opts['--manifest'] || !opts['--objects']) {
    process.stderr.write('Usage: node scripts/verify-publication-edition.mjs --manifest <receipt.json> --objects <exact-R2-mirror-folder>\n');
    process.exitCode = 2;
    return;
  }
  const manifest = JSON.parse(await readFile(opts['--manifest'], 'utf8'));
  const report = await verifyPublicationEdition(manifest, key => readFile(toSafeLocalPath(opts['--objects'], key)));
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  if (report.status !== 'technical_bytes_and_structure_pass') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { process.stderr.write(String(error.message || error) + '\n'); process.exitCode = 2; });
}
