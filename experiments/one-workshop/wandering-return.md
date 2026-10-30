# Wandering return — the freedom test

Small Door · 30 October 2026 · isolated fictional specimen for draft PR #20

**Question:** Does a Workshop database let a hand travel in an odd direction, collect unproven thoughts, change its mind, and bring back *chosen* pieces to the common bench without surrendering its unchosen work or erasing a neighbor's contribution?

This is a small executable **in-memory rehearsal**, not a migrated Workshop database, a branch service, an authenticated permission boundary, or a production feature. It does not prove that a visitor or companion can do this through a real UI. It uses no archival or visitor data and changes no website, Google Drive source, Cloudflare service, or deployed Worker.

## The walk

`wandering-return.mjs` allows one fictional hand to keep an independent `wandering` body. The hand can record several entries, each labeled as `question`, `reading`, `speculation`, or `experiment`, and with a distinct **basis kind** (`original` or `source`). An imaginative sketch is not quietly presented as an archival finding. Original work can be original; source-facing readings keep their source road as a *claim to be verified*.

`returnSelected(shared, wandering, ['one'], generation)` transfers **only explicitly selected entries** into a shared, *proposed* state. It leaves the wandering body unchanged, does not copy the omitted entries or their counts, refuses a selected entry whose basis is marked private, and has no public release operation. A second hand can add a separate entry without replacing the first. A simulated stale generation refuses a conflicting return; this is not a cross-process transaction.

After returning, a hand can add a revision or withdrawal. The earlier events remain individually recoverable, while the ordinary shared view presents current words or an explicit withdrawal notice. A JSON round trip demonstrates that this narrow history can be reconstructed from a serialized snapshot. The controlled test intentionally shows the hand taking an unusual, even silly visual detour. Whether the idea is good is not a prerequisite for recording it as a proposal.

## How to repeat

From a local checkout of this branch, with Node 22+:

```sh
node --test experiments/one-workshop/wandering-return.test.mjs
```

Eight bounded cases cover independence, selective reunion without unchosen/private metadata, all-or-nothing rejection, a second independent hand, stale generation refusal, correction and withdrawal with original history intact, publication/private-source refusal, and serialized cold return. Local Node 22.16.0 execution on the prepared test bytes passed **8/8**; the repository-side readback and CI result must be checked separately after any commit.

## The conspicuous gaps

The model trusts caller-supplied hand names, source/basis access labels, and local generation numbers. It has **no authenticated writer, no server-side authorization, no cryptographically attested source, no atomic database transaction, no durable storage, no real sync/merge engine, no conflict UI, no personal workspace retention guarantee, and no public publication apparatus**. The `historyFor` function is an internal audit path and would require access control in any service. Serialized JSON is not an independently verified backup or a portable multi-instrument Workshop export. No physical D1 database is created, joined, or moved.

A real next test must use an authorized two-hand service with separate private working space, persisted event history, transactional selected promotion, permission-aware search, recoverable conflict handling, and a cold second reader. The human usability test matters: if selecting and bringing work home is harder than hand-carrying old Google Drive records, this new surface has missed its purpose. Do not turn a companion into a data-entry clerk.

**Freedom is the acceptance test.** More precise organization is useful only when it makes wandering, correction, and coming home easier.

Powerful finger. Trustworthy result. — Small Door
