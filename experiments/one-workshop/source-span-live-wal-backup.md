# Source-span catalog — live WAL is not a portable main file

Small Door · 29 October 2026 · draft PR #20 · invented local fixture only

## The crossing

The prior [closed-carrier cold return](./source-span-catalog-v0.md#closed-carrier-cold-return--29-october-2026) closes its SQLite writer before copying the index and Markdown carriers. That is a meaningful boundary. **A live SQLite database in WAL mode is not safely carried by copying only `spans.sqlite`.** Committed rows may still be in `spans.sqlite-wal`, and an apparently readable and internally valid main-file copy can omit them.

The new [live WAL witness](./source-span-live-wal-backup.test.mjs) tests both sides with *invented passage receipts*, Node 22's `node:sqlite`, and the existing `SourceSpanCatalog`:

1. First it initializes and closes the schema, reopens the WAL-mode writer, commits one receipt, and copies only the main SQLite file **while the writer remains open**. The resulting standalone copy passes SQLite `integrity_check` but contains **zero receipts**, although the live source has one. This is a deliberate demonstration of a wrong copying method, not a recommended export.
2. Separately, `node:sqlite`'s `backup(live.db, snapshotPath)` captures a consistent committed snapshot while the writer stays open. The test then inserts another receipt. On reopening the snapshot, the previously committed Workshop passage and Bob's private receipt are present, with their expected fictional reader visibility; the later receipt is absent.

The test is explicitly a *witness/recipe*, not a new production export endpoint or complete archival format. It should be run via `node --test experiments/one-workshop/source-span-live-wal-backup.test.mjs` in a Node 22.16+ checkout. The online-backup function is the existing native SQLite mechanism also used by the earlier [Workbench backup experiment](./bench-sqlite-backup.md), rather than a new copying algorithm.

## What this does and does not earn

A safe live SQLite snapshot is a necessary component of recoverable return, not its completion. **The snapshot contains the entire catalog, including private fixture rows**, regardless of the reader filtering that applies through the catalog API. It cannot be treated as a visitor backpack export or a public share. The test does not transfer or authenticate the actual Markdown source carriers, furnish source custody, encrypt backup bytes, validate a signed manifest, enforce real identity/permissions, prove arbitrary-database import safety, handle rights revocation, exercise simultaneous network clients, or move between physical computers.

This specimen intentionally does not introduce an import service. The separate Workbench snapshot code has additional manifest, schema, receipt, and destination-admission gates; those may inspire later source-span work but **must not be presumed to protect this test's raw backup file**. As with the preceding inventory, the catalog's access labels and source claims are untrusted fixtures.

No historical Drive holdings, real permissions, main branch, deployed public pages, or schedules are changed.

**A readable SQLite file may still be an incomplete return. CLOSE / CHECKPOINT, OR TAKE A REAL ONLINE BACKUP.**

— Small Door · Powerful finger. Trustworthy result.
