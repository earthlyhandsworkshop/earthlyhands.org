# Nightwolf mirror — a cold SQLite return

Small Door · 28 October 2026 · One Workshop draft PR #20 · fictional data only

## The crossing

The first [Nightwolf mirror model](./nightwolf-mirror.mjs) held a complete
generation in memory. It could reject an invalid digest, a lower-generation
incoming envelope, or an incoming envelope that rewrote previously observed
events, actors or objects. It did not survive process exit.

The opt-in [local SQLite receiver](./nightwolf-mirror-disk.mjs) now persists
one complete checked mirror envelope inside a private `mirror_state` row in a
real SQLite file. The receiver opens a write transaction with
`BEGIN IMMEDIATE`, verifies the currently stored envelope, checks the
incoming mirror against that exact current history, and installs the new
generation with a conditional update. Failure rolls the transaction back.
The original [mirror model](./nightwolf-mirror.mjs) and the separate
Old-Growth Workbench chronology v0/v1 remain unchanged.

A caller can close the database, copy the *closed* SQLite file, open that copy
in a fresh Node process, and continue appending a new generation without the
source process or source SQLite handle. This is a narrow local cold return,
not a network sync or an automatic off-machine backup. The module uses
SQLite's DELETE journal mode; copying an *open* database has not been
demonstrated or authorized. Binary fixture bytes are included in the JSON
envelope and checked by the existing SHA-256 logic; this is not an archival
object-storage implementation.

## Executable evidence

[Five tests](./nightwolf-mirror-disk.test.mjs) use only invented actors,
events, and binary bytes. They verify:

1. A file survives close/reopen with the generation and privately scoped
   event projection still readable in the fictional actor fixture.
2. Two independent SQLite connections cannot accept the same generation
   again or rewrite an earlier event.
3. Malformed digests and corrupted binary assertions do not replace a
   previously committed generation.
4. Contradictory SQLite row metadata is refused on reopen instead of
   silently adopted.
5. A SQLite copy, made **after closing** the original, opens in a separate
   receiving Node process; that receiver appends generation 2 while the
   original remains at generation 1. A later independent readback inspects
   both.

Local Node 22.16.0 execution of the exact checked-out fixture produced
**5/5 passing tests**. The repository versions of the new module and test
were read back from GitHub after committing. CI must be inspected at an
exact commit before attributing independent execution to GitHub Actions.

## What the passing tests do NOT establish

The `readForClaimedActor(actorId)` argument is a **caller-supplied name**.
It is not proof of actor identity. Anybody with the database file can read
its private envelope. A local projected private event is not an authenticated
privacy guarantee. No real companion login, per-source permission
enforcement, encryption, protected machine account, network endpoint,
Cloudflare D1/R2 connection, atomic document-plus-blob transaction, or
actual Nightwolf hardware has been tested.

A local mirror digest detects accidental or adversarial alteration **unless
the entire history and its digest are rewritten coherently**. Replacing the
whole database with an old but internally consistent copy also cannot be
detected without an independent high-water mark or trusted witness. This
carrier is not historical proof, a true audit authority, or a public-release
permission.

The demonstration is still **one machine and two processes**, not a
physical two-machine transfer. SQLite's transaction behavior was exercised
in ordinary tests, not proven under sudden power loss. No real Workshop
or historical Google Drive holdings were imported or changed.

The next earned question is how a verified source, its rights and its object
manifest cross with the mirror under an authenticated principal and
independently retained continuity witness. Until that exists, the only safe
input to this prototype is fictional test material.

No deployment, merge, website change, Google Drive migration, or schedule
change was made.

Powerful finger. Trustworthy result. — Small Door
