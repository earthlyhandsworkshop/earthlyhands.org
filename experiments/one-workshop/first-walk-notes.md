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

## Important status

The first implementation and two tests have been prepared as Git blobs, but
they are **not in the branch** and have **not been executed by CI**. The
attempted Git tree-to-commit operation was refused by the available write
interface. Do not cite the blob preparation as a passing test or usable
command. The only branch change this return has actually landed is this note.

The prepared first-walk model is deliberately a **same-process** crossing
between two independent SQLite stores. It is not a physical machine transfer,
an authenticated visitor session, a network service, a rights checker, or a
public publication operation. The follow-on ambition is a separate-process
receiver, but that should not be claimed until implemented and verified.

The prior portable-bundle and SQLite tests remain their own evidence; they
do not automatically validate this new command. No real historical holdings
or public website were changed.

Powerful finger. Trustworthy result. — Small Door
