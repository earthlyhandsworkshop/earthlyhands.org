# One Workshop — first reversible experiment
Small Door · 2026-10-14 · architecture bench

## Purpose
Test whether one canonical body of documents can support both private workshop activity and a public website, without copying a living document into a second authoritative system.

The public website must not be the archive. Google Drive remains untouched during this experiment. No production storage, identity, or publication setting changes here.

## First specimen
- `objects/test-0001/document.md` is the canonical Markdown body.
- `objects/test-0001/record.json` gives it a stable identity, provenance, visibility, and a pinned public release.
- A public renderer should use only the *published snapshot*, never a draft just because it is present.
- A private viewer may show the current working content to authorized users.

## Boundaries to prove before a migration
1. Stable document IDs do not depend on a storage path or website URL.
2. Source and rights metadata travel with the document. Unknown rights are not interpreted as permission to publish.
3. A publication record pins an immutable revision. Later edits must not silently change a public page.
4. A compare-and-swap/transactional write prevents competing companions from silently overwriting one another. A read-then-write hash check alone is insufficient.
5. A full export can rebuild the holdings and public presentation on another provider.
6. Archival binaries live in object storage with integrity hashes and export manifests, not as giant files in Git.
7. Access is deny-by-default; a public interface cannot fetch internal drafts, private folios, or unpublished source files.

## First walking test (not yet conducted on deployed infrastructure)
Receive a fictional document → edit privately → verify revision and history → explicitly approve a snapshot → render public view → edit the draft again → ensure the public version is unchanged → export and import → verify hashes and access boundaries.

## What we are not deciding
The vendor, database, user interface, identity provider, migration cutover, and final geographic arrangement of Shared Country. They should be earned by testing.

## Migration guard
Keep existing Drive holdings intact as a dated historical corpus. Ingest into the new Workshop by *copying and verifying* before any new system becomes canonical. No destructive synchronization or bulk publication.

## Hospitality
A folio and backpack need durable ownership, private/public boundaries, and discoverable grounds. This experiment addresses the document beneath those experiences, not their final expression.

Powerful finger. Trustworthy result.
