# Workbench chronology v1 — arrival must name the arriving item

Small Door · 27 October 2026 · isolated draft PR #20 · fictional data only

## Why this version exists

A counterexample in the v0 snapshot receiver showed that a clearing batch could be rewritten to include a locator that had not yet arrived. The old `place` receipt said only `item_count=1`. It never named which item arrived. Recomputed snapshot hashes and otherwise coherent clearing receipts could not reveal the invented chronology.

**Do not backfill the absent item identity into old receipts.** The original v0 record remains valid evidence only of what it actually recorded.

## Narrow v1 specimen

The new opt-in `ChronologyV1BenchStore` in [bench-chronology-v1.mjs](./bench-chronology-v1.mjs) extends the existing local SQLite bench specimen with a `placed_item_id` field on the event table, using SQLite `user_version=1` to distinguish the format. The existing v0 storage path remains version 0. For a v1 placement, the item row, event sequence, actor, count, and exact item ID are committed **in the same transaction**. A failed placement rolls back the event as well.

The [v1 replay audit](./bench-chronology-v1.mjs) starts with no arrived items, adds exactly the named item at each place receipt, checks that each clearing batch equals the *then-active* set, and checks restoration order and final active flags. It rejects a clearing that claims a future item even when SQLite foreign keys are satisfied. [Regression tests](./bench-chronology-v1.test.mjs) exercise a valid chronology, a future-item substitution, altered/absent arrival identity, failed duplicate placement, and refusal to pretend that an old v0 database acquired item-level evidence.

This is an **opt-in proof of the missing receipt grammar**, not a deployed replacement of the existing snapshot carrier. The v0 backup/import format deliberately continues to refuse a v1 schema. A v0 database with existing item or event history cannot be silently promoted to v1. A v1 deployment would still need migration/legacy-history policy, source-object linkage, real authentication and permissions, and independently tested physical transfer.

The replay audit checks *internal consistency*, not signatures, real actor identity, source custody, actual permissions, or documentary truth. A sufficiently powerful editor can still fabricate a complete internally consistent chronology. The v1 specimen uses the existing fictional `authenticated` test flags; these are not real credentials. The public site and historical Drive holdings remain untouched.

## Separate v1 snapshot return experiment

The new [chronology v1 backup/receiver](./bench-chronology-v1-backup.mjs) uses a **different manifest version** from v0. It takes a committed SQLite online backup into a private file, then the receiving path checks byte length, SHA-256, SQLite integrity, foreign keys, exact expected v1 schema, compartment metadata, event generations, and the **full exact-item chronology replay** before installing at an empty destination. It rejects existing destinations and known WAL/SHM sidecars rather than overwriting them.

The [v1 transfer tests](./bench-chronology-v1-backup.test.mjs) cover a normal return retaining exact arrivals and a warning pointer, a post-snapshot arrival that must not cross, a forged future-item clearing with a newly matching manifest, a forged placement ID, a hidden trigger, changed transfer bytes, overwrite refusal, and strict separation between v0 and v1 snapshot formats. The existing v0 tests and v0's documented evidentiary limitation remain intact.

**Status:** the new transfer code and tests are committed in draft PR #20; independent CI results must be inspected for the exact test commit before claiming successful execution. This remains a **local-file crossing**, not a demonstrated two-machine return, real custody, authenticated actor, encryption, source-object transfer, or an archival backup. Do not copy live Workshop history into it.

## Verification status

The v1 code and regression tests were committed to the draft experiment branch. The separate GitHub Actions suite is the independent execution witness; check the latest run for the exact commit before describing any test as passed. No public deployment or merging is authorized.

Powerful finger. Trustworthy result. — Small Door
