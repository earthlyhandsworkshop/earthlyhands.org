# Nightwolf mirror — a second memory of the last accepted history

Small Door · 28 October 2026 · draft PR #20 · isolated fictional data only

## Why this piece was earned

The [cold SQLite mirror](./nightwolf-mirror-disk.md) rejects an incoming
history rewrite while its own stored previous generation is still present.
But if someone replaces the *entire closed database file* with an earlier,
internally valid copy, the SQLite receiver has no external memory of having
advanced. Its digest is self-consistent. It cannot know it has gone backward.

The opt-in [local tip wrapper](./nightwolf-mirror-tip.mjs) introduces a
second, **separately stored file** containing only the last accepted
generation and digest. On every read and receive it compares that retained
tip to the actual SQLite envelope. If either file is absent when the other
has standing, or if their generation/digest disagree, it **refuses** to
silently adopt the state. A new generation first commits through the
existing SQLite receiver, then advances the tip via a temporary file,
file sync, and rename. It does not rewrite the earlier mirror model or the
Old-Growth Workbench.

The tip contains no private event bodies, object bytes, or claimed actor
names. It is a continuity check, **not** a real security principal, source
permission, archival authenticity claim, or public release.

## Executable return and counterexample

The [six new tests](./nightwolf-mirror-tip.test.mjs) use invented actors,
events, and a tiny fictional binary. They exercise:

1. Close/reopen with the separate tip and the claimed-actor private
   projection still intact.
2. Replace a closed generation-2 database with a valid saved generation-1
   database while retaining the generation-2 tip: refuse read and write.
3. Replace a generation-2 database with a different, internally coherent
   generation-2 fork: refuse the mismatched digest.
4. Delete the tip, or add an undeclared metadata key: refuse to regenerate
   or silently interpret it.
5. Force the tip write to fail **after** SQLite has committed: report
   failure, preserve the mismatch, and refuse subsequent use rather than
   falsely claiming an atomic two-file success.
6. Replace **both** the database and tip with their older valid copies:
   the wrapper **accepts** the rollback. This is a deliberately passing
   counterexample proving the two files are not an independently protected
   witness.

Local Node 22.16.0 execution of the exact source and test bytes passed
**6/6** new tests (and the five preceding cold-SQLite tests also passed).
The GitHub blobs for the new source and tests were independently read back
and match the locally tested Git blob hashes:

- Module: `c8ae36424197dc115f4fd1c9bfd5f42805800aeb`
- Tests: `00df227138deb343500b85576c513e0991933001`

**Independent GitHub Actions verification:** [run 40638072218](https://github.com/earthlyhandsworkshop/earthlyhands.org/actions/runs/40638072218)
at the exact test-bearing commit `08e49e97566f16f42afb458ec3c2659cda4a39de`
completed successfully. The Node 22 log explicitly contains all six new
tip tests, with **261/261 Node tests passing** and **zero failures**.
The separate Chromium folio job also passed; it exercises older browser
custody boundaries, not this tip-file specimen. Later documentation-only
commits do not change the independently tested module or test bytes.

## Limits that must remain visible

This is **one machine, two local files**, not a protected off-machine
witness. Someone who controls both files can rewrite or roll back both
together. The wrapper's read argument is still a caller-supplied actor ID,
not authenticated identity. It does not encrypt the SQLite envelope,
authorize source access, bind a real companion to an identity, or check
whether a historical source assertion is true.

The SQLite commit and the tip-file rename are **not one atomic transaction**.
A failure or interruption between them may leave an advanced database and
an older tip. The deliberate policy is to fail closed and require
source-aware manual recovery; **never** auto-reseed a missing tip or
blindly advance one to match an unexpected database. Tests cover an ordinary
tip-write failure, **not** sudden power loss, fsync guarantees across
filesystems, or adversarial simultaneous replacement of both files.
This does not constitute a production backup or a rollback-proof service.

The next genuine threshold is a tip retained outside the database's
failure and permission domain, authenticated actor and source boundaries,
and an explicitly reviewed recovery protocol. Those are unimplemented.

No real Workshop data, historical Google Drive holding, public website,
Cloudflare deployment, PR merge, or hourly schedule was changed.

Powerful finger. Trustworthy result. — Small Door
