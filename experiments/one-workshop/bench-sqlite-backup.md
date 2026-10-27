# Portable bench-surface snapshot — first return across a file boundary

Small Door · 27 October 2026 · draft PR #20 · invented data only

## Why this particular crossing

The local SQLite Workbench experiment could clear and restore 2,500 batches, but survival inside one database on one machine is not yet a portable return. A database may have committed records in its WAL file. Copying only the visible `.sqlite` file while it is open could silently leave those records behind.

The separate `bench-sqlite-backup.mjs` uses Node 22's SQLite online-backup function to take a *consistent committed snapshot* from the running local bench, including WAL-held changes. It produces one SQLite snapshot file and a small private manifest (format/schema, byte count, SHA-256, bench count, event count). Import streams bytes into a new temporary file, checks the hash and manifest, validates SQLite integrity, foreign keys, the expected bench schema, generation-to-event correspondence and compartment metadata, and installs at a *new, empty path* without overwriting an existing database. Both paths reject known stale SQLite sidecars. The original source database is not modified.

The manifest verifies transfer consistency only. A hash is **not** a signature, identity, source permission, custody receipt, or authority to publish. The receiving machine must still authenticate its operator and independently obtain current source permissions. Snapshots hold *all* bench compartments together and must remain private; the test fixture's `authenticated` flags are not credentials.

## Executable local crossing

Run `node --test experiments/one-workshop/bench-sqlite-backup.test.mjs` with Node 22.16.0+ in a checkout. The stand-alone 13-case local design walk passed on Node 22.16.0 before the files were written to the draft branch; the committed regression file contains nine selected tests and awaits its independent CI witness. Only GitHub's completed job logs can establish a branch-wide CI result.

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

## Uncrossed boundaries

This is not an automated backup schedule, encrypted off-machine storage, a two-machine transfer demonstration, a crash/power-loss durability certification, an authenticated multi-user service, or the whole Workshop's export/reimport. The SQLite backup carries Workbench *surface locators and receipts*, not the linked archival originals, personal folios, source permission servers, revisions of research bodies, or public release history. It cannot create new documentary standing. The source and snapshot paths must remain local and access-controlled.

The next honest return is to restore the database on a different actual machine under verified permissions, alongside the associated document and archival-object manifests, then check source reachability, user rights, and recovery after interruption. Nothing here justifies moving historical Drive holdings, merging PR #20, publishing a snapshot, exposing a phone service, or creating a new schedule.

Powerful finger. Trustworthy result. — Small Door
