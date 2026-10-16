# One Workshop — first reversible experiment
Small Door · 2026-10-14 · architecture bench

## Purpose
Test whether one canonical body of documents can support both private workshop activity and a public website, without copying a living document into a second authoritative system.

The public website must not be the archive. Google Drive remains untouched during this experiment. No production storage, identity, or publication setting changes here.

## First specimen
- `objects/test-0001/document.md` is the canonical Markdown body.
- `objects/test-0001/record.json` gives it a stable identity, provenance, visibility, and a pinned public release.
- A public renderer should use only the *published snapshot*, never a draft just because it is present.
- A private viewer may show the current working content to authorized users.

## Boundaries to prove before a migration
1. Stable document IDs do not depend on a storage path or website URL.
2. Source and rights metadata travel with the document. Unknown rights are not interpreted as permission to publish.
3. A publication record pins an immutable revision. Later edits must not silently change a public page.
4. A compare-and-swap/transactional write prevents competing companions from silently overwriting one another. A read-then-write hash check alone is insufficient.
5. A full export can rebuild the holdings and public presentation on another provider.
6. Archival binaries live in object storage with integrity hashes and export manifests, not as giant files in Git.
7. Access is deny-by-default; a public interface cannot fetch internal drafts, private folios, or unpublished source files.

## First walking test (not yet conducted on deployed infrastructure)
Receive a fictional document → edit privately → verify revision and history → explicitly approve a snapshot → render public view → edit the draft again → ensure the public version is unchanged → export and import → verify hashes and access boundaries.

## What we are not deciding
The vendor, database, user interface, identity provider, migration cutover, and final geographic arrangement of Shared Country. They should be earned by testing.

## Migration guard
Keep existing Drive holdings intact as a dated historical corpus. Ingest into the new Workshop by *copying and verifying* before any new system becomes canonical. No destructive synchronization or bulk publication.

## Hospitality
A folio and backpack need durable ownership, private/public boundaries, and discoverable grounds. This experiment addresses the document beneath those experiences, not their final expression.

## State-model experiment (2026-10-14)

`model.mjs` isolates the fictional document's history, working revision, explicit release snapshot, import validation, and export serialization. `model.test.mjs` provides executable tests:

```sh
node --test experiments/one-workshop/model.test.mjs
```

A local Node test pass covered private/public separation, pinned releases after later edits, refusal of stale expected revisions, export/import round trips, and rejection of inconsistent metadata.

**Current state (2026-10-15):** `index.html` now loads `browser.mjs`, which uses the shared `model.mjs` for revisions, approval, and import/export; the earlier duplicated inline state model is removed. The document stays local to one open browser tab, and the "public doorway" is only a preview of an explicitly pinned revision. It publishes nothing and provides no access control.

### Browser walk test — completed
Ran headless Chromium through Playwright against **byte-matched copies** of the committed `index.html`, `browser.mjs`, and `model.mjs` (Git blob hashes checked). The environment prevented local URL navigation, so the page HTML was inserted directly and the browser module's relative import was mapped to a `data:` module containing the identical model bytes. Verified: initial unpublished state, refusal to approve an unsaved draft, save to revision 2, pinned preview, later private revision leaving public preview unchanged, JSON export, reset, import preserving all revisions and preview, malformed release rejection without clobbering current state, and no browser script exceptions or remote requests. **This is a browser-execution test, not a deployed HTTP serving test.**

To open the experiment in a local web server from the repository root:

```sh
python3 -m http.server 8000
# open http://localhost:8000/experiments/one-workshop/
```

**Remaining boundary:** The model's expected-revision guard detects conflicts in a single in-memory state; it is *not* a transactional, multi-user storage guarantee. That requires a server transaction or conditional write tested under actual concurrency. A JSON round trip confirms structural consistency, not authenticity, independent provenance, or verified binary integrity. Public preview content is still present in the same client session as drafts, so it does not demonstrate private/server-side authorization.

Later experimental work lives alongside this first browser walk; see the locally persisted and portable test bearings below. Nothing in this directory authorizes a production migration, public deployment, or release of historical holdings.

## Persisted, reversible crossing — 15 October 2026

The *independent* Node 22+ modules now include `sqlite-store.mjs` (a local SQLite generation-conditioned write and separately projected release), `blob-integrity.mjs` (streaming SHA-256 verification and content-addressed receipt), `blob-transfer.mjs` (manifest-checked binary copying), and `portable-bundle.mjs` (one fictional document's history, pinned release, and verified binary companions). These are **local experiments**. The original `index.html` remains browser-tab-local, and none of these modules is an authenticated or deployed multi-user service.

To repeat the portable crossing directly from this branch's checked-out repository:

```sh
node --test experiments/one-workshop/portable-bundle.test.mjs
```

The six regression cases cover a 3 MiB object with private revision history and stable public release; tampered document; tampered binary; non-pristine destination refusal; invalid/duplicated claims; and a writer intervening just before the final SQLite restore. Small Door ran the committed test bytes locally against Git-blob-matched implementations: six passed. Further local related-module tests passed, but they are not a substitute for CI on the branch.

**Unproven:** user authentication and authorization; HTTP boundary; source identity, historical provenance, or permission to publish; crash durability; a transaction spanning SQLite and binary storage; a complete multi-document Workshop or Shared Country migration. A failed late restore can leave a verified but unreferenced binary, never a silently overwritten working revision. The tests use invented content only. Google Drive holdings stay untouched, and this draft must not be merged or deployed without an independent deliberate crossing.

Powerful finger. Trustworthy result.

## Native folio import receipts — 16 October 2026

`native-folio-history.mjs` is a **pure, not-yet-UI-wired** model for the visitor who exports Face 111's JSON, edits it away from the Workshop, and imports it again. The existing `native-folio-crossing.html` still carries **only the latest file**, replacing its previous local single-pocket copy on a successful import. Do not represent it as preserving a history yet.

The new model preserves the exact raw native JSON from each receipt, keeps older imports recoverable after a later edit, refuses an invalid import or an overflowing journal instead of discarding history, and can receive an older single-pocket record without rewriting the native bytes. It limits one journal to 12 receipts and 3 MB; an exported journal may be restored only into an empty journal. These are specimen limits, not a final visitor retention policy.

Five tests in `native-folio-history.test.mjs` passed under Node 22.16.0 from byte-for-byte Git-blob-matched copies. This proves model behavior, **not** browser persistence, migration of actual visitor data, chronology or authorship, access protection, multi-user operation, or a completed personal backpack. The next earned work is an explicit visitor interface with legible import receipts, recoverable older versions, export before clearing, refusal to overwrite a different backpack, and browser-restart tests. Neither the source page nor the public site was changed.
