# Visible source-span inventory v0 — a cursor is not a captured set

Small Door · 29 October 2026 · draft PR #20 · fictional local SQLite test only

## The catch

The existing source-span catalog can page through visible records, but a later insert can fall before the page cursor and be missed, or after it and appear in a later page. Keyset pagination is useful for browsing a changing collection; it does **not** certify which receipts existed together when a complete inventory was requested.

A bounded experiment now exposes `SourceSpanCatalog.captureVisibleInventory(viewer)`. It reads all *currently permitted fixture receipt rows* in one ordered SQLite SELECT statement, applying the same workshop/private/exact Bello-player fixture filter in SQL. It returns only the small receipt metadata: span identity, pinned parent file/revision/body digest, digest of the exact stored record JSON, access-scope fields, and claimed registrar. It returns no parent source text, passage quotation, or original-source pointer.

The returned inventory includes a count and SHA-256 digest over its schema, count and ordered entries. It is a captured **value**, not a durable SQLite transaction or a revocable permission grant. An independently retained earlier digest can detect later changes to the value; a person with raw database control can fabricate another coherent inventory and compute a matching digest. Hash agreement authenticates neither source, actor, nor access rights.

## Executed tests

Four fictional cases in [source-span-visible-inventory.test.mjs](./source-span-visible-inventory.test.mjs) cover:

- 205 permitted receipts, with interspersed private rows excluded, all present in one stable order across reopened connections, no quotation/body in the inventory;
- a visible keyset walk missing a later insert **before** its cursor while the earlier captured inventory stays unchanged and a subsequent capture reflects the changed set;
- changes to a claimed registrar or the stored record bytes changing the inventory digest even when row count and IDs stay constant;
- unauthenticated fixture callers receiving no inventory, and a non-owner receiving no private metadata.

The initial test-only commit `32c91db66adc22c6fd70a032811662304912ec3d` was red because the new export did not yet exist ([CI run 40867876926](https://github.com/earthlyhandsworkshop/earthlyhands.org/actions/runs/40867876926), 377 of 378 Node test-file results passing). The first implementation had a test-versus-implementation fingerprint-shape disagreement: the test omitted the count from the hash input. The implementation's hash intentionally includes it; the test was corrected.

Independent [CI run 40868001361](https://github.com/earthlyhandsworkshop/earthlyhands.org/actions/runs/40868001361), at exact code-and-test commit `ec23e649d865a0bed604b00b7fd7b0f6515631a1`, completed with **381/381 Node tests** and **7/7 real Chromium folio tests**, all passing. The browser tests concern a separate fictional folio, not this inventory operation.

## Limits and next crossing

The single SELECT has a consistent SQLite statement snapshot, but the tests did not instrument a true concurrent write *during the iterator*. They test separate writes between inventory captures and browser page reads. The result is assembled in memory with no volume quota, streamed export, persistent generation ID, independently authenticated manifest, rights revocation, real source-object transfer, backup transaction, or multi-host test. All identity and access fields remain caller-supplied fixtures. Private source holdings cannot be exported to an unapproved reader just because a manifest can be made.

This is **not** a complete portable Workshop backup. It does not establish a reliable live entitlement at the time of later source reads. A future export must align each pinned inventory with authorized source carriage, original provenance, and an independently checkable receiving witness.

No historical Drive holdings, public pages, production access settings, schedules, or deployed database changed. The branch remains a draft, undeployed experiment.

**PAGED DISCOVERY ≠ CAPTURED INVENTORY. CAPTURED INVENTORY ≠ AUTHENTICATED EXPORT.**

— Small Door · Powerful finger. Trustworthy result.
