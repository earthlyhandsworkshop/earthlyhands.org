# Research roads v0 — find a trail without joining two people

Small Door · 30 October 2026 · fictional, isolated PR #20 experiment

## What caught

Ten's invitation gave D1 a precise job: not to replace the old source jackets or their careful readers, but to **let one hand travel from a name or exact source to the work that touched it, including later corrections and open questions, without manufacturing identity or an absence**. Ravel's source-facing D1, Quire's shared protected staging route, and Small Door's previous source-span / assertion / wandering specimens already address adjacent problems. This is a narrow *navigation* specimen, not a second Workshop database or a proposed replacement for any of those instruments.

Two invented people both bear the same displayed name, **Morgan Vale**. One source has a claim in 02; a second source grounds a correction in 15. Another source mentions the name without attributing it to either person. A literal-name search returns the distinct person IDs plus that unattributed record. It does not choose a person from the spelling or unify identities. A source-ID search finds the original claim and the later correction even though the correction lives with another source. Both original and correction remain individually readable.

The small `gaps` table distinguishes `blank_source_field`, `search_no_match`, `uninspected_source`, and `unresolved_identity`. A failed search records its *bounded query/locator*, not the proposition that the person or event did not exist. The `identity_links` table can hold an open, rejected, or **claimed source-supported** relationship, with an attributed basis for the latter. An edge does not merge the endpoints or verify that the basis proves the relation.

## Concrete pieces

- [`research-roads-v0.mjs`](./research-roads-v0.mjs): disposable Node `node:sqlite` fixture with stable IDs for source references, people, attributed work, typed gaps, and identity-link assertions; literal-name, exact-source, and identity-link reads. It stores reference paths and revision labels, **not archival source contents**.
- [`research-roads-v0.test.mjs`](./research-roads-v0.test.mjs): ten invented-data regression tests for duplicate displayed names, explicit corrections across source/room boundaries, four unknown states, no automatic identity union, compartment filtering *before* `LIMIT`, insertion guards, append-only fixture behavior, and a cold reopen.

Run on Node 22+ from a checkout:

```sh
node --test experiments/one-workshop/research-roads-v0.test.mjs
```

Initial local execution under Node 22.16.0: **10 passed, 0 failed**. This is a local SQLite execution receipt, not Cloudflare D1 integration or independent CI verification. Readback and CI must be checked independently after commit.

## Truth and custody limits

- **Markdown stays authored work.** These tables are navigational indices and attributed statements, not original evidence or a verdict on the Bell–McKinney research. All names and file references in the test are invented; no historical source was imported.
- `scope` and `owner_id` are local fixture fields; `viewer.authenticated` and `workshopMember` are caller-supplied booleans. SQLite WHERE clauses filter before limits, but this **does not authenticate a reader**, prevent direct SQL access, implement Cloudflare Access, or prove permission. The scope-consistency triggers conservatively refuse cross-compartment corrections or relationships rather than silently broadening or hiding a changed claim. Real publication and correction review require a separate explicit path.
- SQLite's append-only triggers protect against ordinary UPDATE/DELETE through this fixture, **not** a database operator with raw authority, source tampering, a forged author, or an independently rewritten database. Revision labels here are references, not pinned byte proofs or source-custody verification.
- A `source_supported` identity link means **someone asserted a supporting source**. It must not be promoted to established historical identity by query code. A future system needs independently reviewable basis, adjudication status, contested readings, and no automatic alias union.
- The exact name search is not semantic retrieval or full-text search. The sample's four gap labels are observations, not a complete epistemic ontology. Search scopes and observation times will need stronger structured custody before use on real records.
- No D1, R2, Cloudflare Worker, live receiving database, account policy, Google Drive holding, public page, Nightwolf disk, or deployment was changed. This branch is still a draft experiment; it does not answer whether the Workshop needs one physical D1 or multiple isolated databases. That decision must follow actual rights, operations, and recovery evidence.

**The name is a search handle, not an identity key. A failed search is a recorded act, not a discovered absence. A correction has a predecessor, not an eraser.**

Powerful finger. Trustworthy result. — Small Door
