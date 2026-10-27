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

## Stale-tab backpack export — 22 October 2026

`backpack-walk.html` now checks whether local browser storage still matches the snapshot used by the open tab **before creating an export**. If a different saved copy is present or storage cannot be read, export requires explicit visitor confirmation and uses the distinct name `earthly-hands-backpack-earlier-or-unverified-copy.json`. Declining keeps the old copy available in the tab but creates no file and does not alter storage. The normal export name remains `earthly-hands-backpack.json` for an unchanged saved state. Unsaved textarea writing still blocks export before any stale-copy consent is offered. A conflict already observed by the tab is not erased merely because storage later happens to match the earlier bytes.

Draft correction: `db4ecec8`; six committed regression cases: `98d46564`. The six tests in `backpack-stale-export.test.mjs` were previously executed under Node 22.16.0 against Git-blob-matched branch files: **6 passed, 0 failed**. Current readback on 22 October confirms test blob `ff0ead3f5ebd4bd3da88a63ffc4415b87c3b12e6`, browser specimen blob `59a91d983878730fd8d441d556bf2243f1764119`, and model blob `3b10dc46a441ca706206a2c1cc357068478effeb`. These are Node tests using simulated DOM and storage, **not an actual browser download test**. No fresh Node execution is claimed by this documentation change.

To repeat the suite from a checkout:

```sh
node --test experiments/one-workshop/backpack-stale-export.test.mjs
```

**Not established:** atomic multi-tab safety, browser download behavior, crash durability, user authentication, or a production multi-user backpack. This is still an isolated draft experiment. No public deployment or historical Drive migration follows from these results.

Hand: Small Door

## Native folio history: don't mistake an older tab for the complete journal — 23 October 2026

A new inspection found that `native-folio-history-walk.html` downloaded its held complete journal, or "latest" source folio, **without checking whether another tab had changed browser storage**. A simulated two-tab encounter with the branch's actual inline handler and history model reproduced the problem: one receipt was downloaded under the ordinary complete-journal filename while the stored journal contained two, without a warning.

The draft now checks `localStorage` against the tab's remembered snapshot before **either** download. If the tab saw a conflict, cannot read storage, or has received a version that failed to save in storage, the visitor must explicitly consent; the file is distinctly named `*-earlier-or-unverified-copy.json`. Declining leaves the held content and stored browser data unchanged. A previously observed conflict remains disclosed even if storage later returns to the old bytes. This is **best-effort disclosure and naming**, not atomic multi-tab safety, authenticated visitor custody, or guaranteed browser persistence.

The repaired page was re-fetched from the draft branch at blob `03894a8fb9da9d49d748988429aa033bf5812d08`. Eight behavioral probes using the actual branch inline handler and model with **simulated DOM/storage in a JavaScript isolate** passed: stale-decline, stale-consent with distinct filename, clean export, source-folio stale decline and consent, unreadable storage, in-tab unsaved import, and sticky observed conflict. A repeatable Node regression source `native-folio-stale-download.test.mjs` is committed at blob `b8ae538ed45e119af3ad2726f14e5303b856bb93`; **its native Node execution is not yet recorded**. Repeat it from a branch checkout:

```sh
node --test experiments/one-workshop/native-folio-stale-download.test.mjs
```

This still needs actual browser download and cross-tab/restart tests. The PR stays draft and undeployed; no historic Google Drive objects or public website pages were touched. The stale earlier copy is recoverable by deliberate choice, not silently promoted to the current journal.

Hand: Small Door


## CI readback — 26 October 2026 (27 October UTC)

The earlier statements above that certain native Node tests had not been executed and that this folio-history specimen lacked an independently exercised real-browser download/cross-tab test describe their **earlier** verification state. They are superseded **for the following narrow checks on this exact branch commit**, not for untested visitor or production behavior.

[GitHub Actions run 40435323834](https://github.com/earthlyhandsworkshop/earthlyhands.org/actions/runs/40435323834) completed successfully on **27 October 2026, 01:55 UTC**, against PR #20 head `3a46b0e20a516a523e57577cae873e9700a14acf`. Readback of both job logs, not merely a green badge, established:

- **Node 22**: `node --test experiments/one-workshop/*.test.mjs` — **72 tests passed, 0 failed, 0 skipped**.
- **Headless real Chromium through Playwright**: `node --test experiments/one-workshop/native-folio-browser.e2e.mjs` — **7 tests passed, 0 failed, 0 skipped**. These ran the experimental page and modules on a temporary local HTTP server with invented folio data. The cases exercised an actual downloaded damaged-storage rescue envelope preserving an unmatched UTF-16 surrogate; opening-snapshot versus another-tab content; an observed cross-tab edit that reverted to old bytes; a storage-refused tab-only receipt that must not be released; and overlapping imports or a delayed import arriving after release.

This is a material improvement over the earlier simulated-DOM-only claims. The same tests do **not** establish a private authenticated service, atomically synchronized browser tabs, recovery from every crash, phone use, cross-browser portability, the original Public Lands source page's full export/reimport encounter, unrestricted storage durability, permission to publish, or a deployable multi-user Workshop. Origin-wide `localStorage` still is not an access-control boundary. The experiment stays on a **draft, undeployed** PR; the production site and historical Google Drive holdings were not changed.

**Provenance of this update:** workflow file `.github/workflows/one-workshop-draft-tests.yml`; inspected Actions run and both job logs; branch sources `native-folio-browser.e2e.mjs` (blob `5c46e6ac9b1a6d7cee24e7b567c694c47d05a47f`) and `native-folio-history-walk.html` (blob `8a2078767ad7e9d39425d6198a0719eacab2ba08`). The note itself is a documentary readback; it introduces no new runtime behavior.

— Small Door · CI evidence return

## Old-Growth Workbench: a withdrawal is a public act at its audience — 27 October 2026

This branch's **fictional, in-memory** `bench-standing.mjs` now distinguishes a withdrawn conclusion from one that quietly disappears. The earlier privacy repair refused restricted private/workshop settlements replacing broader public standing, but the separate `withdraw` event still deleted current standing with only a reason and recording-hand string. A private challenge could therefore be followed by a silent public absence through that route.

The withdrawal event now requires an explicit audience level matching the standing being withdrawn, a reviewer list, review basis, source references eligible for that audience, and a concise audience-facing notice. The model refuses a restricted withdrawal of broader standing and refuses a public withdrawal citing private source references. A successful withdrawal projects a `status: withdrawn` notice at the existing audience level; internal history preserves the earlier settlement and the withdrawal event. A newly settled successor replaces the notice without erasing the prior event history.

The model emits **only** the intended notice and eligible source references in its audience projection, not private challenges, internal review notes, or the global ledger generation. The standing projection now explicitly includes `status: settled` on live entries. The new regressions in `bench-standing.test.mjs` test private challenge → refused private withdrawal of public standing → explicit visible public withdrawal, source-permission refusal, required review and notice, and later reopening.

**Verified exact branch:** model blob `d6a38c94379c8479468107d34c8615e5cc88d088`, test blob `7379b267bbed2465c5cc8c7f53a3dfd3824caa11`. [GitHub Actions run 40564874943](https://github.com/earthlyhandsworkshop/earthlyhands.org/actions/runs/40564874943) passed at commit `1efd5558478315974ab2c655963db2dfec600984`: **92/92 Node 22 tests and 7/7 actual Chromium tests**, with both job logs inspected. The bench-standing regression is part of the **Node** suite; the Chromium suite covers the separate fictional folio specimen, not this withdrawal model.

**Remaining authority boundary:** `reviewedBy`, `recordedBy`, and caller-supplied `visibility` are unverified assertions in this fixture. Real withdrawal needs authenticated hands, source-permission review, authorized publication decision, a separately versioned public/history track, and a genuine server-side authorization and transaction boundary. This cannot validate that a public-facing notice's prose itself avoids every private inference. A local test pass is not proof of documentary truth or a functioning multi-user service. Nothing here authorizes a merge, deployment, or migration; historical Drive holdings and live public pages remain untouched.

Hand: Small Door

## The workbench is a temporary encounter, not a permanent court — 27 October 2026

The standing ledger's proposal/challenge/settlement/withdrawal events should **not** be confused with the lifecycle of the Old-Growth Workbench itself. A workbench encounter can become sufficiently understood, draw its closing line, place each exact object under its own custody or named unresolved rest, verify its return address, and **stop presenting itself as active work**. Such clearing is not automatic publication or immutable truth; a later new source belongs to a linked new inquiry, not a silent rewrite of the closed encounter.

See [`bench-closure-vs-publication.md`](./bench-closure-vs-publication.md) for the bounded design distinction and fictional acceptance walk. It separates **closing the encounter**, **clearing the objects**, and **authorizing outward speech**, which may have different responsible hands. It intentionally chooses no permanent committee or universal reviewer and changes no live code, historical Google Drive holdings, or public website.

Hand: Small Door

## Workbench conflict glance — advisory preflight, 27 October 2026

Ten proposed that the Old-Growth Workbench should quietly warn about **possible conflicts while a question is being worked and before an exact piece is put away**, not merely preserve a correction after the fact. The isolated [`bench-conflict-glance.mjs`](./bench-conflict-glance.mjs) and [15 fictional tests](./bench-conflict-glance.test.mjs) are a first, executable answer. They do **not** connect to live Drive records, the Workshop 15 index, a model's actual responses, or the public website.

Two explicit calls to the same pure inspector:

- **`phase: 'working'`** — warn when two authorized, explicitly scoped claim values differ; when the *same stable object ID* has different revisions; when a proposed claim has no exact source road; or when its source is too restricted for the proposed audience. A similar name or title is **not** an identity match.
- **`phase: 'clearing'`** — additionally warn before a proposed move, locator release, named rest, or encounter closure if authority is unconfirmed, a paired object is omitted, an exact target-file path collides, the original behind a locator is unverified, an unresolved matter has no named rest, or the final destination/receipt has not been verified.

Every warning includes a **reason and next inspection**, not a verdict, silent correction, permission grant, or automatic move. A clean result does not authorize anything. Hidden private neighbors are excluded **before** comparisons so adding one does not change a public warning count or metadata; an actual system must enforce authentication and source ACLs upstream, rather than trusting the caller-supplied `audience` or `authority` fields. The code uses exact keys and cannot discover semantic contradictions, disguised duplicates, identity errors, or false metadata on its own.

**Proposed eventual seam, not implemented:** authenticated source reader → authorized, revision-pinned candidate/neighbor snapshot → conflict glance during work or before clearing → source-facing examination by the responsible hand → explicit crossing and readback. At a final clearing, check again against current source versions; no stale preflight can serve as a move receipt. The bench can still become empty without becoming forgetful.

Local Node 22.16.0 execution of the two exact files: **15/15 tests passed**. Both files were committed and fetched back; Git blob SHAs matched the locally tested bytes: model `5472d49a2993bed731c473671f45495bdec9565a`, tests `5a2e79e25bd57603d6ed823010d817ff8de22a47`. CI completion should be separately witnessed before claiming a branch-wide pass.

No actual conflict detection across Workshop holdings, no authenticated warning UI, no source move, no public publication, and no new schedule occurred.

Hand: Small Door
