# Source-span reanchor v0 — a moving finger is not a moved claim

Small Door · 29 October 2026 · fictional One Workshop experiment · draft PR #20

## The living seam

The preceding [source-span v0](./source-span-v0.md) safely binds an exact passage to one revision of a long Workshop-like file. But our actual long fingers keep growing as different hands append passages. A correct old offset can become stale after a new opening paragraph, while an exact quotation can appear twice or be copied into an unrelated place.

A search hit in the new revision must therefore **not** silently become an updated source claim. The distinction is between *finding possible new text locations* and *establishing continued provenance*.

## What was built and run

- [source-span-reanchor.mjs](./source-span-reanchor.mjs) accepts an existing pinned source-span record, its exact old source snapshot, and a proposed new snapshot of **the same file**. It validates the old record with the existing source-span reader and checks the new snapshot's digest.
- It looks for the exact prior quotation in the new body and returns a **proposal only**: already-pinned, single-candidate, ambiguous, many-candidates, not-found, or unsafe-boundary-only. It returns at most eight candidates, with before/after context-comparison hints. It never returns a new source-span record, changes a file, chooses among multiple matches, or grants rights.
- [source-span-reanchor.test.mjs](./source-span-reanchor.test.mjs) provides **11 fictional tests**: same revision, an inserted preface shifting offsets, duplicated wording, missing exact wording, a unique unrelated replacement, wrong parent file, reused revision, false digest/tampered record, bounded candidate overflow, identical body under a new revision, and an unsafe UTF-16 boundary.

**Verification:** local Node 22.16.0 run of these 11 tests passed. The locally used predecessor source-span.mjs matched live Git blob SHA 99b829b1cae2bd5813f984f52427393092b0a98a. The two new branch files were read back and matched locally tested Git blob SHAs 1d9dfb7a6bfc32a31e0f60faf8820fbe3c38a304 (implementation) and d4f3d6d350e9223d36ad10fedd3f1c37c14f7f14 (tests). Independent [GitHub Actions run 40824963750](https://github.com/earthlyhandsworkshop/earthlyhands.org/actions/runs/40824963750), on exact test commit 0133626ae8b0fae6abd29137b5502a152275351f, completed with **353/353 Node tests** and **7/7 separate Chromium folio tests** passing.

## What this does not prove

A single-candidate remains **unapproved even if its surrounding context is byte-identical**. The old passage may have been copied, reintroduced, reattributed, or otherwise changed in meaning. A not-found result means the exact words were not matched in this supplied revision—not that a source, person, or historical event did not exist. The context hints use only 64 adjacent UTF-16 code units; they are clues, not identity or source witnesses. The candidate proposal does not transfer original maker, reader, source authority, access permission, or publication status.

The helper is a pure Node function over two already supplied full bodies. It provides **no** storage index, authenticated source access, full provenance history, publisher approval, concurrent writes, secure identity, cross-host return, human evaluation, or independent original-source verification. Its hashes detect mismatches against supplied expectations, not forgery by a person able to rewrite all inputs. No real archival source or Google Drive holding was transferred or changed. The public website remains untouched. The PR remains draft and undeployed.

A later independent hand may examine a candidate and, if its evidence earns it, make a **new versioned, attributable binding** with a road to the old one. This experiment deliberately supplies no automated adoption function.

**Old location ≠ current location. Current text match ≠ historical continuity.**

Powerful finger. Trustworthy result. — Small Door

## Unicode ingress guard — 29 October 2026

Source-span snapshots now refuse ill-formed UTF-16 before creating or trusting a digest. The old reanchor fixture containing a lone low surrogate was replaced by an early-rejection test; it no longer pretends a malformed source body is a valid pinned passage. The reanchor implementation retains a defensive unsafe-boundary status, but every valid old and target snapshot now passes the well-formedness gate. This does not elevate candidate matches into verified history, permissions, identity, or published claims. See [source-span-unicode.test.mjs](./source-span-unicode.test.mjs).
