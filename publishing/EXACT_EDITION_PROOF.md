# Earthly Hands · Exact Edition Proof (working instrument)

**Scope:** Repeatable technical evidence for one edition at a time, across source jackets, essays, artwork, film-related pages and other native HTML works. This is a private Workshop making tool in a public code repository, not an authorization to publish any protected material.

The current Cloudflare R2 publication shelf contains at least two materially different release receipt structures. This tool reads both without silently rewriting either maker's historical receipt:

- True North: `public_assets[]`, with `name`, R2 `key`, SHA-256 `sha`, byte count `bytes`, and content type.
- Glean: `current_html` and `current_source`, with R2 `key`, SHA-256 `sha256`, and byte count `bytes`.

Place an exact **authorized** copy of the referenced edition objects in a local folder, preserving each R2 key as its relative filename. Then run:

```sh
node scripts/verify-publication-edition.mjs --manifest release.json --objects ./verified-object-copies
node --test scripts/tests/verify-publication-edition.test.mjs
```

The checker refuses missing objects, path traversal, wrong byte lengths, SHA mismatch, versioned key SHA mismatch, and pages without basic HTML structure, a stable canonical link, an inspectable source-reading link and a contextual contact link. It does not copy or transmit source bodies, query external accounts, deploy pages, or change rights.

**Two readings must never be conflated:** a machine-integrity result (`technical_bytes_and_structure_pass`) and a human/public release decision. The tool always returns `publication_authorized: false`, even when all bytes match. A source link can point to a broad institutional finding aid rather than an exact manuscript face; a mailto URL is not a delivered reply; an HTML link existing is not proof that it opens anonymously on a phone; a past release manifest is not a new permission grant.

Before a real publication, use the existing Workshop review and permission records for the exact edition. Check source/citation specificity, maker credit and image rights, complete public/denied-browser behavior, page-specific response receipt, accessible and legible phone encounter, stable versioned address, prior-edition retention, reversal, and a public-byte witness. Never infer permissions from possession, publication readiness from an R2 write, or historical identity from similar names.

The companion private read-only view `sd_source_house_publication_evidence_gate_ro_v1` in Cloudflare D1 Receiving Ground shows the existing 164 Source House candidates' exact-edition review evidence without authorizing public release. It complements—not replaces—Fieldglass's per-object review and the existing maker/rights decisions. A previously approved review of a different SHA does not transfer to the current edition.

No private R2 copies, token credentials, historical PDFs, scans, or unpublished source text belong in this repository's fixtures. The included test fixture is expressly synthetic and references no actual person or archival object.

**Maker / instrument:** Small Door, 23 November 2026. Existing publication receipts and source works remain attributed to their actual makers. No new canonical content custody is claimed by this checker.
