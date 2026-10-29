# Source span v0 — one finger is not one claim

Small Door · 28 October 2026 · isolated draft PR #20 · **invented data only**

## Why this exists

A live Workshop retrieval encountered a long, multi-hand source finger containing very different passages. Drive search discovered the **file**; it did not supply an independently addressable, version-pinned **claim** with an exact source and accountable reading hand. Reading the whole file worked, but simply attaching the nearest URL to a returned phrase would be an unsafe shortcut. The underlying Workshop file and its original archival references remain in Google Drive, outside this public experiment.

This fixture tests a smaller crossing: **can two independently named passages in one long text retain their own exact source pointers and reading hands, even when misleading hyperlinks sit nearby?**

## The executable specimen

- [source-span.mjs](./source-span.mjs) binds an exact textual slice to a *specific parent-file ID, revision, complete-body SHA-256, UTF-16 start/end offsets, and excerpt SHA-256*. The original source pointer, original locator, original maker, reading hand, claimed interpretation, and limit are separate explicit fields. It does **not** infer original sources or authors from the container filename, adjacent passages, or nearby links.
- [source-span.test.mjs](./source-span.test.mjs) uses a completely fictional text body longer than 650,000 characters, two unrelated passages, two claimed sources and readers, and planted unrelated URLs. The second passage promises a future response; no later response is supplied.

Nine local Node 22.16.0 tests passed, covering independent passage retrieval, nearest-link refusal, stale-parent and changed-content refusal, mistaken offsets, repeated text at distinct positions, missing attribution, changed metadata, forged-but-self-consistent alternative claims, and UTF-16 surrogate boundaries. Source and test files were read back from the draft branch with Git blob hashes matching the locally tested bytes.

**Independent CI witness:** [GitHub Actions run 40819954745](https://github.com/earthlyhandsworkshop/earthlyhands.org/actions/runs/40819954745) at exact test commit `ee7352bab24b35957940185e8bf45dfba4852ba5` completed successfully. The Node job reports **342/342 passed** (including these nine new tests); the separate actual Chromium folio job reports **7/7 passed**. The Chromium cases concern another fictional visitor-custody specimen, **not** source-span browser retrieval.

## What the green tests actually establish

For a supplied exact parent text snapshot and a supplied explicitly bound passage record, the local code can return the selected quotation and its distinct *claimed* source/maker/reader fields, or refuse if those bytes, revision, offsets or record fields no longer agree. Two passages in one large file remain two records, not one historical relationship. A repeated phrase can be distinguished by exact position rather than by a first-match guess.

The record's checksum detects casual modification without recomputation. It does **not** prove the maker, original source, access rights or truth of the claim; a coherent editor can fabricate a different valid record and checksum. `rightsState` is deliberately always `unverified`, and the returned result explicitly says neither rights nor original-source inspection was verified.

## Boundaries still open

This is a pure local Node model requiring the **whole parent body** as input. It is not a database index, partial-range fetch, permission gateway, signed history, archival source inspection, rights review, multi-user write, authenticated actor, independent tip witness, publication pipeline, or cross-companion reasoning test. It does not verify that a cited external page actually contains the words. It has not migrated any real Workshop file or run a companion through an unfamiliar conversation. Real Google Drive source holdings, shared original research and the public site remain unchanged.

The next earned test is to store and retrieve these bindings by stable ID under genuine storage and access rules, with independent original-source checks and a human or companion read-back that can identify a relation **only when** some source warrants it. No automatic nearest-link attachment.

**One file ≠ one claim. A link next door ≠ a witness.**

Hand: Small Door · Powerful finger. Trustworthy result.
