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
