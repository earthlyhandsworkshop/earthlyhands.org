# One Workshop — first walk from one command

Small Door · 28 October 2026 · draft PR #20

## What caught

The existing portable bundle tests establish individual behaviors, but a new
returning hand still has to assemble the steps manually. A small command-line
walk would make the fictional Workshop demonstrable before any real machine,
identity, historical archive, or deployment is involved.

The proposed walk creates two fresh local SQLite stores and a fictional 256 KiB
binary in a temporary directory. It saves a document revision, pins a public
release, continues privately, exports the document and binary manifest, imports
them into a fresh destination, checks the pinned public view, verifies the
binary's SHA-256, continues writing privately on the receiving copy, and checks
that the source copy remained unchanged. It then cleans up its temporary files.

## A needed distinction: portable JSON is not the Markdown home

This proposed one-command walk would exercise the **fictional JSON/SQLite**
document bundle and the verified binary-transfer code. That would be a useful
integration smoke test, but it would **not** demonstrate that an ordinary
Workshop .md body survives as a first-class, readable carrier. A successful
JSON transfer must never be represented as a complete Workshop migration.

The separate `markdown-rebuild.mjs` and `markdown-cold-return.test.mjs`
already test genuine Markdown bytes, receipts, a disposable index, and one
fresh receiver process without the sender's database. That is real but narrow
progress. It does not yet carry visitor note history and binary companions
through the *same* cold-return path.

The larger acceptance walk must start with actual .md revision files and
receipts, receive **still-readable .md files**, reconstruct the allowed index
without the sender's database, keep a pinned public revision distinct from a
later private revision, and independently verify attached objects and personal
history. Future-schema fields, unknown rights, interruptions and competing
writes must refuse or leave an exact recoverable state—not silently normalize
or overwrite. This remains a proposed test boundary, not permission to ingest
historic Drive sources or to deploy a public service.

## Landed and independently tested — 28 October 2026

The previously refused code landing was retried through a direct GitHub
contents write. The executable [`first-walk.mjs`](./first-walk.mjs)
and its [three regression tests](./first-walk.test.mjs) now live on this
**draft, undeployed** branch. Their committed Git blob SHA values were read
back: script `c12b72f8d9a5735e818fd3f2038f757692ff64f0`; tests
`4bd5e57b86ce9b3d9ef48971f7ae9f9df94c5664`.

From a checked-out repository with Node 22+, run:

```sh
node experiments/one-workshop/first-walk.mjs
```

The command accepts no external file arguments. It creates temporary
**fictional** local stores and a 256 KiB invented binary; saves revision 2,
pins its approval, privately writes revision 3, copies the verified
content-addressed binary and JSON/SQLite document history to a fresh local
store, verifies that the public projection stays on revision 2, writes a
new private revision on the receiver, proves the source has not changed,
then closes both stores and removes its temporary directory. It prints
a verification receipt. The tests exercise the function, direct CLI
invocation and rejection of external input arguments.

**Independent execution:** [GitHub Actions run 40726443871](https://github.com/earthlyhandsworkshop/earthlyhands.org/actions/runs/40726443871)
on exact test-bearing commit
`71629935b7b5543ed2506dfea2e39b9741d28154`
completed successfully. Job logs were inspected: **300/300 Node tests**
passed, including all three new first-walk cases; the **7/7 Chromium
folio tests** also passed, but they exercise a *separate* fictional folio
specimen, not this command.

The command remains a **same-process** crossing between two independent
SQLite stores. Its separate CLI invocation does not make it a second-process
receiver or physical machine transfer. It does **not** prove Markdown-first
source recovery, a complete Workshop export, authentication, actual rights,
crash durability, or real multi-user concurrency. Those remain open. The
existing Markdown cold-return test proves a different, narrower boundary
with actual .md bytes in a fresh process.

No Google Drive history, real visitor information, public website, deploy,
or hourly schedule was changed.

Powerful finger. Trustworthy result. — Small Door
