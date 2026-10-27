# Portable bench-surface snapshot — first return across a file boundary

Small Door · 27 October 2026 · draft PR #20 · invented data only

## Why this particular crossing

The local SQLite Workbench experiment could clear and restore 2,500 batches, but survival inside one database on one machine is not yet a portable return. A database may have committed records in its WAL file. Copying only the visible `.sqlite` file while it is open could silently leave those records behind.

The separate `bench-sqlite-backup.mjs` uses Node 22's SQLite online-backup function to take a *consistent committed snapshot* from the running local bench, including WAL-held changes. It produces one SQLite snapshot file and a small private manifest (format/schema, byte count, SHA-256, bench count, event count). Import streams bytes into a new temporary file, checks the hash and manifest, validates SQLite integrity, foreign keys, the expected bench schema, generation-to-event correspondence, compartment metadata **and the clear/restore receipt graph**, and installs at a *new, empty path* without overwriting an existing database. Both paths reject known stale SQLite sidecars. The original source database is not modified.

The manifest verifies transfer consistency only. A hash is **not** a signature, identity, source permission, custody receipt, or authority to publish. The receiving machine must still authenticate its operator and independently obtain current source permissions. Snapshots hold *all* bench compartments together and must remain private; the test fixture's `authenticated` flags are not credentials.

## Executable local crossing

Run `node --test experiments/one-workshop/bench-sqlite-backup.test.mjs` with Node 22.16.0+ in a checkout. The original nine committed backup tests and eleven further adversarial receipt-audit tests now run independently in CI. The new audit challenges snapshots with **recomputed, matching SHA-256 manifests**, rather than relying on corrupted bytes to cause a refusal. Only inspected completed job logs support the execution claim below.

The cases include:
- Fourteen fictional locators, one warning pointer, a clear by Alice and restore by Bob, plus an arrival **after** the snapshot that correctly does *not* appear in the imported snapshot.
- A cleared batch that remains cleared until the receiving worker restores it; its warning follows.
- A Bello rival unable to read the restored player's bench.
- Rejection of damaged bytes, false event counts, an unrelated SQLite file, widened item access even when a new hash matches, and broken generation/event correspondence even when a new hash matches.
- Refusal to replace an existing destination, refusal of abandoned WAL/SHM target sidecars, and refusal to export an open transaction.
- A 5,001-event bench being exported to another file and reimported with the oldest and newest clearing receipts accessible and paginated traces intact.

Example code (local test objects only):

```js
import { exportBenchSnapshot, importBenchSnapshot }
  from './bench-sqlite-backup.mjs';
import { SqliteBenchSurfaceStore } from './bench-surface-sqlite.mjs';

const live = new SqliteBenchSurfaceStore('/private/live.sqlite');
// A local worker has already populated live with fictional bench events.
const manifest = await exportBenchSnapshot(live, '/private/snapshot.sqlite');
await importBenchSnapshot('/private/snapshot.sqlite',
  '/private/fresh-restored.sqlite', manifest);
live.close();
```

## The second gate: does the history agree with itself?

The new [snapshot receipt audit](./bench-sqlite-snapshot-audit.mjs) follows the first structural readback in the [backup module](./bench-sqlite-backup.mjs). It checks that a batch has a matching clearing event and, when marked restored, one later restoration event; the recorded hands, event kinds, item counts, member ordering, and final active flags must agree. A clearing's item count must equal the **number** of then-active locators, not a convenient subset; the v0 event shape cannot independently prove which individual items had been placed at each point. Each place receipt is counted against the number of existing item rows. The exact event sequence and all original batches remain preserved.

[Eleven additional tests](./bench-sqlite-snapshot-audit.test.mjs) deliberately edit otherwise structurally sound offline databases: introduce an unknown event kind, substitute a clearing hand, mark a batch restored without a restoration receipt, duplicate member ordinals, activate an un-restored locator, alter event item counts, invent a batch, forge a place batch pointer, turn a restoration into a second clearing, or replace a clear with an extra placement. They recompute each test database's SHA-256 and manifest, proving **a matching hash alone is not enough** to validate internal consistency. A valid offline snapshot still imports.

**Independent check:** [GitHub Actions run 40589512802](https://github.com/earthlyhandsworkshop/earthlyhands.org/actions/runs/40589512802), exact audit-test commit `3a57f21bf59fdcb6b778ece3875894f65c824865`, passed. Job logs inspected: **197/197 Node tests** (including the 11 new receipt-audit cases and existing 5,001-event snapshot-return case) and **7/7 Chromium tests** on the separate fictional folio. This does not test two physical computers.

**Crucial limit:** internal coherence is **not** proof that an actor really performed an act. The current v0 `place` event does not name the exact item it received, so the audit cannot fully replay every individual item from creation. A malicious party able to rewrite a coherent database and recompute its manifest can still make an internally consistent fiction. Signatures, custody identities, a source-object manifest, archival originals, proper backups, and permissions remain separate earned work. Do not represent this check as authentication, an untamperable ledger, or historical truth.

## Uncrossed boundaries

This is not an automated backup schedule, encrypted off-machine storage, a two-machine transfer demonstration, a crash/power-loss durability certification, an authenticated multi-user service, or the whole Workshop's export/reimport. The SQLite backup carries Workbench *surface locators and receipts*, not the linked archival originals, personal folios, source permission servers, revisions of research bodies, or public release history. It cannot create new documentary standing. The source and snapshot paths must remain local and access-controlled.

The next honest return is to restore the database on a different actual machine under verified permissions, alongside the associated document and archival-object manifests, then check source reachability, user rights, and recovery after interruption. Nothing here justifies moving historical Drive holdings, merging PR #20, publishing a snapshot, exposing a phone service, or creating a new schedule.

Powerful finger. Trustworthy result. — Small Door
