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

Five tests in `native-folio-history.test.mjs` passed under Node 22.16.0 from byte-for-byte Git-blob-matched copies. This proves model behavior, **not** browser persistence, migration of actual visitor data, chronology or authorship, access protection, multi-user operation, or a completed personal backpack.

**Separate browser-facing specimen now present in this branch:** `native-folio-history-walk.html` imports successive native Face 111 folio files into a local receipt journal; it can inspect and download individual originals, export a complete journal, restore an export only into an empty pocket, and release local copies after confirmation. This is a distinct experimental page; the earlier `native-folio-crossing.html` remains a latest-file-only pocket. The new HTML has been inspected as code, but this return did **not** perform an independent browser walk, restart test, cross-tab race test, or source-page reimport. Its localStorage pre-write comparison is best-effort, **not** atomic concurrency protection. The next earned checks are browser restart/recovery, malformed import, storage refusal, competing tabs, keyboard and phone use, and returning the exported original to its source page. Neither the source page nor the public site was changed.

## Unrecognized browser journal — raw rescue (18 October 2026)

The separate `native-folio-history-walk.html` specimen now exposes a **download-only raw recovery control** if a browser-stored journal fails validation at page opening. The exact `localStorage` string read at opening is offered as an explicitly *unverified* plain-text file. Import, restore, and clearing remain locked; the recovery action does not rewrite or delete the stored value. The control is hidden during normal valid-journal use.

**Verification so far:** the draft-branch patch was read back byte for byte from GitHub after commit. An independent browser interaction/restart test has **not** yet been completed; successful download on actual browsers, changed storage in another tab, and repair of damaged contents remain unproven. This raw rescue is not validation, automatic repair, authentication, encryption, or an access boundary. In particular, the page still uses origin-wide `localStorage`; merely placing a future private backpack on a different URL path would not isolate it from other scripts on the same origin. Do not deploy as a private visitor system on this evidence.


## Backpack receiving correction — 21 October 2026

The previous `backpack-walk.html` importer passed the arriving backpack directly to `persist`, replacing saved local notes even when both backpacks were valid. It could also reset unsaved textarea writing. Small Door traced and documented both paths in Workshop 15: `Small Door — Backpack receiving must not erase local notes — 2026-10-21.md` (Drive ID `1PtlW8uMRbogX-aKwF7sd9YXdfU6mK6Mq`).

The draft branch now includes a narrow **source-level repair** in `backpack.mjs` and `backpack-walk.html`. `receiveBackpack(current,incoming)` combines distinct annotations without discarding local entries, accepts identical duplicates, refuses divergent note text or pinned source revision for the same document ID, refuses different visitor labels on a nonempty device, and refuses overflow instead of truncating. An empty device may restore its carried owner label and entries. The page checks unsaved textarea contents before import; errors leave saved local state unchanged. Visitor labels remain unauthenticated strings, not ownership proof.

GitHub commit receipts: model `6b2e487ca48bef66e606fb5d0a1de31885c90e1f`; browser `d46126f071e81d1ffdea238c5cf2163c07c7201b`. Readback blob SHAs: `3b10dc46a441ca706206a2c1cc357068478effeb` and `88f02a1852b859c840eb3defdd22bbf0dd142479`. Twelve checks on those exact readback source blobs passed in a JavaScript isolate: eight pure-model checks and four simulated DOM/storage import checks. They covered disjoint arrival, repeat arrival, preservation of unsaved words, conflict refusal, empty restore, immutability, and capacity. This is **not** a real-browser test or a native Node suite run. A subsequent commit (`54bc3ede76ed061daa5aa845172ba95513eca50f`) added `backpack-receiving.test.mjs` with eight `node:test` cases for additive receiving, repeated arrivals, conflicting notes and source revisions, differing visitor labels, empty-device restoration, overflow, and malformed input. The test file is present in this draft branch; run `node --test experiments/one-workshop/backpack-receiving.test.mjs` to repeat those checks. This unit coverage is not a real-browser, browser-storage-capacity, cross-tab race, or download test.

The PR remains a draft, undeployed, and not an authenticated or multi-user system. Browser storage quotas, downloads, cross-tab races, and actual visitor walkthroughs remain unverified. Google Drive historical holdings and the public website were not changed.

## Removal-door Node verification — 22 October 2026

`backpack-removal.test.mjs`, committed in `6a6113e5f336e6357e78a68e2d0fb7e2fe17b2c9`, has now been run under Node 22.16.0: **4 passed, 0 failed**. Before execution, the local test (`46f50d41402d0493608478704f987bc68d364874`), browser page (`c2b24f07d5c9dda81d354b52f2ed7e94ce9b8105`), and backpack model (`3b10dc46a441ca706206a2c1cc357068478effeb`) matched the current draft branch's Git blob SHAs. The cases protect unsaved text during removal, deliberate removal when clean, new unsaved notes, and refusal of a changed-tab removal. This closes the previous **not-run-under-Node** caveat for this particular suite; it does not establish real-browser behavior, atomic cross-tab protection, durable storage, or a deployed multi-user system. No deployment or migration is authorized by these checks.

Hand: Small Door

## Backpack export: unsaved-writing boundary — 22 October 2026

An exported backpack serializes **saved notes**, not the current textarea. Before this correction a visitor could type different words, export an apparently successful backpack, and later discover that the file carried only the older saved note. The draft browser specimen now refuses export while the visible note differs from its saved counterpart; it instructs the visitor to save or copy the words first. Export of clean saved notes remains available. This is a UI preservation boundary, not full visitor revision history.

The new `backpack-export.test.mjs` contains four simulated DOM/storage cases: an edited draft, a brand-new unsaved note, an unchanged saved note, and save-then-export. The exact committed bytes have now been executed under Node 22.16.0: **4 passed, 0 failed**. Before execution, the test (`31fcdb1dc3ca29dbe65d023bebfe59bbd567007e`), browser page (`1bfc73fe9c906bcbb3c2f0a6454dabd07459a3c8`), and backpack model (`3b10dc46a441ca706206a2c1cc357068478effeb`) matched the draft branch's Git blob SHAs. This closes the **Node suite unexecuted** limitation for this specific test file; an actual browser download, storage persistence, mobile interaction, and cross-tab race remain unproven. No production deployment, merger, or historical Drive migration is authorized by this small correction.

Hand: Small Door
