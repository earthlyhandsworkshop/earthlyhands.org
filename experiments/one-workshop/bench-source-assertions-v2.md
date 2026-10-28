# Source assertions v2 — an original statement survives its correction

Small Door · 27 October 2026 · isolated experimental branch, draft PR #20 · entirely invented data

## What earned this specimen

The [chronology-v1 Workbench](./bench-chronology-v1.md) proves that a placement receipt can name the exact arriving item, yet its materialized source pointer and warning-pointer list can be edited without contradicting the v1 chronology. A stronger transport checksum does not supply facts that were never placed in the event.

This next specimen asks a narrower question: **can an arriving source assertion remain independently readable when somebody later corrects it?** It must not give old v0/v1 receipts a witness they never had.

## Opt-in, pure receipt grammar

[bench-source-assertions-v2.mjs](./bench-source-assertions-v2.mjs) carries a single fictional bench's source-claim ledger separate from the existing v0/v1 Workbench SQLite stores. It creates no migration and does not edit the public site.

An `arrive` receipt includes the exact item ID, original source pointer, warning pointers, compartment, claimed actor, event and assertion IDs, and a digest of the claimed content. A `correct` receipt names its predecessor assertion and digest, supplies a new assertion, and requires a basis pointer and claimed actor. The original receipt remains in the ledger; the current materialization is only the latest asserted view. No old assertion is silently overwritten by a correction.

The ledger replays event sequence, IDs, predecessor links, compartment continuity, content digests, and a SHA-256 receipt chain. An independently retained earlier **tip digest** can detect a subsequently rewritten history. The ledger's own self-consistent tip by itself is **not** an authentication mechanism; an editor with complete control can fabricate an internally coherent alternative and recalculate every digest.

This is a pure in-memory / JSON model. Its expected-generation argument is not a transactional multi-user compare-and-swap. The actor and basis fields are **claims**, not verified credentials, a source document, or a rights grant. The compartment check preserves one fictional fixture's declared access shape, not actual access control. Tidy clear/restore events and source custody remain separate concerns, not an implemented connection here.

## Verified counterexamples and crossings

The [eight executable tests](./bench-source-assertions-v2.test.mjs) use invented leaves, pointers, identities and compartments. They show:

- arrival and attributed correction preserving the original source, original unresolved warning, predecessor, and basis pointer;
- refusal to accept an altered current source, erased warning, or modified old arrival with unchanged receipts and digest links;
- refusal of incorrect predecessors, missing basis, changed compartments, stale generation, repeated arrival or event ID, and a false legacy-version label;
- reconstruction from serialized JSON; and
- a **deliberately accepted**, internally consistent alternative history whose tip differs from an independently retained earlier tip. The acceptance is part of the evidentiary warning, not a security achievement.

Independent CI: [GitHub Actions run 40622949088](https://github.com/earthlyhandsworkshop/earthlyhands.org/actions/runs/40622949088), exact implementation-and-test commit `701bf2b9439b47eb5a44ddc830e28f4069451845`, recorded **234/234 Node tests** and **7/7 Chromium tests** passing. The new module contributes eight Node cases; the Chromium suite is an existing browser-boundary suite, not a v2 browser deployment test.

## What remains unearned

This is **not** an authenticated, signed, transactionally persisted, encrypted, independently witnessed, provider-independent, or recoverable Workshop service. It neither moves large archival source objects nor binds them cryptographically to their asserted IDs. It does not prove a real historical statement, authorize publication, establish actor identity, permit source access, or protect an independently stored tip. It has not been integrated into v1 SQLite backups or visitor backpacks, and it has not been tested between physical machines.

If further work catches, it should investigate a genuinely transactional versioned storage carrier with independently held source assertions, real source-object integrity and permissions, plus a controlled return test. Preserve older receipts with their actual evidentiary limits. No historical Google Drive holdings were touched.

Powerful finger. Trustworthy result. — Small Door
