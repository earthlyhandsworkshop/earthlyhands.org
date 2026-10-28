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

The [v1 transfer tests](./bench-chronology-v1-backup.test.mjs) cover a normal return retaining exact arrivals and a warning pointer, a post-snapshot arrival that must not cross, a forged future-item clearing with a newly matching manifest, a forged placement ID, a hidden trigger, changed transfer bytes, overwrite refusal, strict separation between v0 and v1 snapshot formats, and a 5,001-event replayable snapshot return. The existing v0 tests and v0's documented evidentiary limitation remain intact.

**Independent verification:** [GitHub Actions run 40608812042](https://github.com/earthlyhandsworkshop/earthlyhands.org/actions/runs/40608812042), exact code-and-test commit `6875503d36a58e999087b8719059d0bb458239bd`, passed **220/220 Node tests** and **7/7 Chromium tests**. The Node logs explicitly show the new 5,001-event chronology-v1 return case passing. This remains a **local-file crossing**, not a demonstrated two-machine return, real custody, authenticated actor, encryption, source-object transfer, or an archival backup. Do not copy live Workshop history into it.

## Return-under-pressure checks — 27 October 2026

Three further independent regression tests cover what the successful 5,001-event return alone cannot establish:

- **Compartment preservation:** a fictional private Bello player's bench and its warning pointer cross in the same snapshot as a separate workshop bench. The rival still cannot read the private bench through the returned model's access filter. These flags are invented fixtures, not real identity or authorization.
- **Incomplete transfer:** a deliberately truncated snapshot, paired with the original valid manifest, is refused; the destination is not installed, the source remains byte-for-byte intact, and no temporary staging file is left by this ordinary error path. This simulates incomplete bytes, **not** a sudden power failure or filesystem crash.
- **Concurrent post-restore writing:** two independent SQLite connections to the restored file cannot both write against the same stale generation. The losing writer receives a conflict, and the winning arrival remains replayable.

The exact test commit `34dd9bd26c224c45ebf9c67c6a88ca39cd13c2bf` passed **223/223 Node tests** in [GitHub Actions run 40609434780](https://github.com/earthlyhandsworkshop/earthlyhands.org/actions/runs/40609434780). These tests extend the local-file evidence; they do not prove two-machine recovery, real credential enforcement, or actual interrupted-power durability.

## Independent-process return — 27 October 2026

The [independent-process crossing test](./bench-chronology-process-return.test.mjs) extends the v1 local-file handoff beyond two SQLite handles inside one Node process. A source process exports a fictional snapshot. A separate Node executable process, given only a copied snapshot, a private manifest, and a fresh destination path in a different directory, imports it and checks the exact item arrivals, warning pointer, clearing/restoration, and generation. The original process independently reopens the returned file and audits the chronology again.

A second spawned receiver is handed a deliberately forged clearing that names an item arriving later. The test recomputes the forged snapshot's SHA-256 manifest, so its refusal must come from the chronology audit rather than a mismatched transport hash. The receiver exits with an error and leaves no installed destination.

**Independent execution:** [GitHub Actions run 40610164965](https://github.com/earthlyhandsworkshop/earthlyhands.org/actions/runs/40610164965), exact test commit `64c2b2a4c5251bcf0d0494b10fcd232aba179cb5`, recorded **225/225 Node tests passed**, including both new process-boundary cases. This proves **separate processes on one CI runner**, not separate physical computers or networks. Both processes still have access to the same checkout and filesystem environment. No encryption, identity service, archival-original transport, or real source permission check is implied. The receiving machine has not been demonstrated on Nightwolf or any other second device.

## A limit on what an arrival receipt records

The v1 placement event records the item ID, not the source pointer or warning list. A [fictional regression](./bench-chronology-v1-unbound-fields.test.mjs) demonstrates that altering these two fields after placement leaves the existing chronology internally consistent and accepted on import when the accompanying checksum is also updated. Thus a successful return of an unchanged warning pointer does not establish the pointer's authenticity or permanence.

[CI run 40611160620](https://github.com/earthlyhandsworkshop/earthlyhands.org/actions/runs/40611160620) passed this known-limitation test in the 226-test Node suite at commit `d0dae1e0f6e390a222f14bdc084b8169ad29e480`. This is a boundary finding, not a green light for real holdings. Any new design must explicitly account for original source and warning assertions, later corrections, and independent authorization. Existing receipts must not be retroactively treated as evidence they never contained.

## Verification status

The v1 code and regression tests were committed to the draft experiment branch. The separate GitHub Actions suite is the independent execution witness; check the latest run for the exact commit before describing any test as passed. No public deployment or merging is authorized.

Powerful finger. Trustworthy result. — Small Door
