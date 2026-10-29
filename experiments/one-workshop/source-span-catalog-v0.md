# Source-span catalog v0 — a passage address is not a source passport

Small Door · 29 October 2026 · isolated draft PR #20 · invented data only

## The earned question

A live Workshop retrieval had to fetch a research finger hundreds of thousands of characters long just to distinguish two passages many pages apart. Earlier fictional [source-span v0](./source-span-v0.md) demonstrated exact parent-revision and source/reader binding; [reanchor v0](./source-span-reanchor-v0.md) keeps a moving match a proposal rather than established continuity. Neither made the separate receipts independently addressable after a session ended.

This experiment tests the narrower crossing: **can another authorized fixture hand discover a specific stored passage receipt by stable ID, without treating the index as an original source, storing the entire parent body, or silently broadening a private source?**

## What landed

[SourceSpanCatalog](./source-span-catalog.mjs) is a local Node 22 SQLite specimen using the existing [source-span](./source-span.mjs) exact-snapshot reader and the shared Workbench fixture access grammar. It stores an immutable-through-this-API receipt under a unique ID, its parent file and revision, an explicitly claimed registrar, and a declared compartment. It stores **no full source body**. A registered record must already agree with its exact source snapshot. Duplicate IDs refuse rather than overwriting an earlier reading. A later version needs a separately named record; the catalog neither reanchors nor revises an old one.

An authorized fixture query retrieves the small record by stable ID; returning its exact quotation and declared source details still requires the caller to provide the **correct complete pinned source snapshot**. That source is checked again using the prior integrity reader. An index hit alone is not proof of historical text, provenance, rights, or source custody. The actual original source and the accountable reading hand remain distinct claimed fields.

The read and listing queries filter by compartment **inside SQLite before returning rows or applying the page limit**. The modeled compartments are workshop, exact-owner private, and exact-player/exact-match Bello. A hidden ID and an absent ID both return null to a fixture viewer without disclosed metadata. Public registration is deliberately refused; publishing is a different authorized crossing. This is not an actual permission service.

## Tests and verification

[Ten executable tests](./source-span-catalog.test.mjs) use a completely invented 658,000-plus-character finger. They check independent passage retrieval; hidden/missing equal-absence behavior; exact version/byte refusal; duplicate ID refusal across two SQLite connections; reopening the local DB; public/invalid-scope refusal; Bello match isolation; hidden-row exclusion *before* LIMIT; modified stored-receipt refusal; and full compatibility with source-span's 128-character ID grammar (distinct from the Workbench's narrower actor-ID grammar).

The ten tests passed under local Node 22.16.0 against exact Git-blob-matched predecessor modules: source-span blob `3827dad423d426e3461af2d44c60f1cb9764fd20`, bench-sqlite-core blob `2ac87993ce5103b4fa8363371ed35c9940999740`. The committed new implementation and test blobs were fetched back and matched the locally tested bytes: `c262f582603242a6b77ed74bdf05f662bd33984c` and `8b7f7eb6201373c63b7dbe732a679992366b3a95`.

Independent [GitHub Actions run 40838062264](https://github.com/earthlyhandsworkshop/earthlyhands.org/actions/runs/40838062264), on exact test commit `c5fa744d4143bc7c4aabf70a60a9fdb2e0d5a461`, completed successfully. Both job logs were inspected: **366/366 Node tests and 7/7 separate real Chromium folio tests passed, zero failures**. The Chromium tests concern another fictional folio specimen; they do not execute this catalog in a browser.

## Uncrossed boundaries

This is a **local-only SQLite receipt index, not a usable multi-user Workshop database**. The `authenticated`, `workshopMember`, principal, owner, and match fields are caller-controlled fixtures, not proved identities or permissions. Direct filesystem/SQL access bypasses the modeled read filter; the local database is not encrypted. A person able to rewrite its raw records and recompute their hashes can forge an internally coherent alternative. The API's insert-only behavior is not independently witnessed append-only storage.

The catalog requires full parent text for deposition and readback; it does not provide partial-range fetch, source-backed retrieval, independently authenticated original documents, source-rights review, live authorization, revocation, cross-host access, backup/export, transactional cross-system custody, or crash/concurrent-worker stress proof. The two-connection test exercises duplicate-ID refusal sequentially, not a simultaneous writer race. The catalog's declared compartments do not authorize publication. There was no historical Drive import, no public website modification, no merge, and no change to any live Workshop permission or schedule.

The next genuinely new question would be whether a separately authenticated, rights-scoped provider can supply a pinned source body while a reader discovers only permitted receipts—and whether the encounter remains useful after a cold return. No mechanism or assignment is implied by that question.

**Indexed receipt ≠ original evidence. An address is not a passport.**

— Small Door · Powerful finger. Trustworthy result.


## Parent-revision coherence test — 29 October 2026

An adversarial follow-up exposed a real **catalog-internal contradiction**, using invented text only. Before this correction, two separately valid source-span records could both register under parent file `fake-finger` and revision `rev-7`, while pointing at **different complete body digests**. Each record passed its own source check; the catalog had no cross-record test saying that one file/revision should identify one pinned byte state. A local red test demonstrated the omission: it expected refusal but registration succeeded.

The opt-in catalog now checks for an existing different digest **inside the same SQLite `BEGIN IMMEDIATE` transaction as insertion**. A conflicting body under the same parent ID and revision refuses without inserting a second claim. The check includes preexisting v0 rows and needs no extra table or backfill. Different parent revisions may legitimately differ; different files may reuse a revision label; multiple independently named readings of the **same exact pinned body** remain allowed.

Four new [fictional regression tests](./source-span-parent-revision.test.mjs) reproduce the former failure, check rejection across two SQLite connections without damaging the first record, and protect those three legitimate cases. A local Node 22.16.0 reproduction was red before the guard (**3/4 passing**) and green afterward (**4/4 passing**). The committed code was read back at Git blob `6931d5ff9a314f70d51848d5bbba5e28833dddbe`, and the new tests at blob `8ffb1dbefa28970a332c812440ad58294e6bd121`. Independent [GitHub Actions run 40844137866](https://github.com/earthlyhandsworkshop/earthlyhands.org/actions/runs/40844137866), exact test commit `9e5a6a6a0cd0ccc50b08038fbb028435593df69a`, reports **370/370 Node tests and 7/7 separate Chromium folio tests passing**. The browser cases are not a catalog test.

**Limit:** This is an API-level consistency check on a local, untrusted-fixture catalog, not source authentication or tamper-proof storage. A person with raw SQLite write access could change rows or bypass the API. Two connections were tested sequentially, not an actual simultaneous process race or a network service. Real providers may represent revisions and text transformations differently; a production importer must define its exact byte representation and revision-identity contract before applying this rule. No real historical file, live permissions, public site, or schedule changed.

**A revision label cannot identify two different pinned bodies in the same catalog.**
