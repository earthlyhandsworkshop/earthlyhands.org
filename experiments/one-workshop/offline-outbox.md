# Two doors, one return — offline outbox reconciliation specimen

Small Door · 29 October 2026 · draft One Workshop PR #20 · fictional data only

## Why this caught

Ten asked whether a companion might contribute through Cloudflare or through Nightwolf, whichever door is available, and find the same work when the two are rejoined. He also named the important failure: files must stop being the work. The existing one-way Nightwolf mirror proves *receiving* a succession of sealed generations, not how a disconnected contribution joins the shared history. `rsync` alone has no answer to two people editing the same object.

This is a **small, isolated contract test**, not the promised two-way system. It does not change the public site, any real Cloudflare service, historical Google Drive, or Nightwolf. It uses the already drafted [companion-door policy](./companion-door.mjs) and the existing [one-way mirror](./nightwolf-mirror.mjs).

## The demonstrated grammar

Each incoming event has an independent `eventId`, `actorId`, `objectId`, `kind`, `parentRevisionId`, `scope`, and `body`. The receiver is assumed to have authenticated and bound the claimed actor through a **server-owned** context. That assumption is *not* established by the fixture, and a companion name or ordinary ChatGPT conversation is not an authentication credential.

The [pure receiver](./offline-outbox.mjs) models two distinct acts:

- **`note`** adds an independent contribution to an already authorized object. Two hands can add different notes while disconnected. The order of their *receipt* is retained, but neither note edits the other's bytes or object revision.
- **`revision`** proposes replacement working text against a specific parent revision. An exact-current parent advances the working head. A known but stale parent becomes a **held proposal**, with its exact body and the blocking head retained. It does not become current without review. An unknown parent is rejected, never invented or silently merged.

The receiver detects identical event-ID retries, refuses a reused ID with altered content, and rejects unknown rights, mismatched claimed actor, disallowed private access, edits through a public-release object, mismatched scope, and undeclared packet fields. Malformed batches yield no new state from this pure function. The author may read their own held proposal; a different actor does not see someone else's held queue. Private object projections use the existing permission decision specimen.

## Executable fictional crossing

[Seven Node tests](./offline-outbox.test.mjs) exercise:

1. A Cloudflare-side fictional note is seen in a generation-one Nightwolf mirror; a separately prepared Nightwolf note joins the shared event stream; a generation-two mirror then shows **both**, and replaying the identical offline note creates no third copy.
2. Two edits with the same parent leave the first as current and the second **held, not erased**; retrying it is acknowledged as already held.
3. An event ID whose contents change refuses reuse whether its original is accepted or held.
4. A new revision against the current head can proceed without deleting the older held proposal.
5. A private folio remains invisible to an unauthorized actor and rejects their attempted contribution.
6. A mismatched actor, unknown rights, public-release write, wrong scope, and unsupported future field are refused.
7. A mixed good/bad packet cannot mutate the caller's original state; an unknown parent remains unmerged.

The mirror integration is deliberately an **in-test adapter for accepted fictional events**. It does *not* export the held queue into the Nightwolf mirror. Thus the test proves no rejected work is silently erased **in the receiver's model**, not that all proposals have been durably copied to both machines. The versioned event stream uses invented texts and a tiny invented binary. There is no source-custody or publication claim.

Local Node 22.16.0: **7/7 passed** for the newly authored test with stand-in copies of the existing imported policy and mirror behavior; the full branch CI is the independent run of these files against the actual committed imports. Exact committed Git blob hashes (read back after upload): module `a653dc921dc75281ebcfc96f82bd2e091f67efa2`, tests `e2c93192c1519d3fdc244025505cfca8de9576ea`.

**Independent branch CI:** [GitHub Actions run 40895896841](https://github.com/earthlyhandsworkshop/earthlyhands.org/actions/runs/40895896841), exact documentation-bearing head `57bc7e6c703ebdcc0bbc230fe8d25c2b0e26efc4`, completed **successfully** on 29 October 2026. The workflow runs `node --test experiments/one-workshop/*.test.mjs` against the actual committed `companion-door.mjs` and `nightwolf-mirror.mjs` modules, so it includes all seven new tests. Its separate existing Chromium folio job also passed, but that job does not test offline outbox transport. This is branch regression evidence, not a two-machine or live-service witness.

## What is still missing

There is **no real two-way synchronization, durable outbox, credentialed bridge, portable conflict-jacket export, verified second machine, crash recovery, server transaction, D1/R2 import, or actual `rsync` transfer here**. Two independent HTTP requests invoking this pure function against a shared database would still require a transactional compare-and-swap/serialization boundary. A retry after lost acknowledgment needs a durable journal; a conflict needs an authorized, reviewable bench road and export to Nightwolf, not merely an array in memory. A verified held proposal must not disappear from the local outbox until its receipt and preservation are proven.

The next earned test is consequently more specific than “make rsync bidirectional”: wrap this grammar in a **disposable SQLite transaction and outbox journal**, disconnect the receiver process, survive restart, replay at least once, then independently restore both accepted and held work and permissions from a complete exported generation. After that, credentials, revocation, multi-machine transport and real source rights still need their own gates.

**Additive contribution can be automatic. Contested replacement must stay visible and reviewable.**

No claim of production readiness; PR #20 remains draft. No public deployment, real source movement, schema migration, schedules, or account settings were changed.

Powerful finger. Trustworthy result. — Small Door
