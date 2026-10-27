# Bench scale crossing — indexed, recoverable surface experiment

Small Door · 27 October 2026 · draft PR #20 · invented data only

The earlier in-memory `bench-surface-return.mjs` is deliberately bounded at **2,000 events** and replays its entire history on each append. Thousands of routine Workbench interactions per day or week would outgrow it. That prototype remains intact as an isolated reference; it has **not** been replaced in any public or live Workshop surface.

## New local SQLite specimen

[`bench-surface-sqlite.mjs`](./bench-surface-sqlite.mjs) and its four small supporting modules keep the active bench in indexed tables and the clearing/restoration trail in an append-only SQLite event table. A bench has its own generation, compartment, exact item identities, batch snapshots, and source/warning pointers.

- `place` receives a fictional locator, not a source file.
- `clear` atomically records **exactly** the current active item IDs, clearing hand, and batch ID; it removes those locators from the active surface without touching originals.
- `restore` atomically returns the exact batch, preserving any new items that arrived meanwhile. The old clear event remains in history, and the restoring hand receives a separate trace.
- `readActive`, `readBatch`, `readTrace`, and `readNoticeSuggestions` use permission-scoped, consistent SQLite read transactions. Traces and unsent notice suggestions are paginated to 100 entries per read, not loaded from the beginning each time.
- Writes use `BEGIN IMMEDIATE` plus an expected per-bench generation inside one SQLite transaction. A stale writer, duplicate event, incomplete clearing list, or failed restore rolls back instead of silently replacing another hand's work.

## Executed local acceptance walk

The exact source and tests were run under **Node 22.16.0** using `node --test experiments/one-workshop/bench-surface-sqlite*.test.mjs` (run from the repository root in a checkout). **12/12 tests passed**, including:

- Fourteen invented locators cleared by one companion and restored by another, preserving an unresolved warning pointer.
- A new fifteenth arrival surviving restoration; close/reopen persistence of the database and the old clearing receipt.
- Two independent SQLite connections refusing a stale competing write; invalid clear and duplicate event ID rolling back fully.
- Private and Bello player/match compartments hiding active items, batches, traces, and notices from unauthorized fixture viewers.
- **2,500 clear/restore cycles on one bench, or 5,001 committed events including initial placement**, with the first and last batch receipts still recoverable and bounded trace pages working. The local test completed in approximately 2–3 seconds on the available runner. This is a bounded software test, **not** a measured multi-user traffic service or guarantee at any daily rate.

All eight files were read back from the draft branch and compared against locally tested Git blob hashes. The committed source and test bytes matched. The complete GitHub Actions run must be inspected separately before a CI-wide claim.

## Uncrossed boundaries

This is a **local persistence experiment**, not a server. The `authenticated`, `workshopMember`, owner, and match fields are **caller-provided test fixtures**, not actual identity proof. Access labels and warning IDs are not independently checked against Drive or other source ACLs. The setup method is not a public bench-creation API. No real notifications are sent, no subscriber preferences are consulted, and no live source, folio, Bello match, or public page is read or modified. No external service, export/import, multi-host synchronization, production backup/recovery, revocation, or physical-phone interface has been tested.

The next earned crossing is a verified source/identity gateway and a small authorized multi-worker encounter, not a bulk migration or a declaration that the Workshop is deployed.

Hand: Small Door · Powerful finger. Trustworthy result.
