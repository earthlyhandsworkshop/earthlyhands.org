# Quire — Follow One Claim on the protected two-hand staging Worker

**Standing:** bounded research-through-design operator; private staging; proposal-only.  
**Current specimen:** the repository-governed review-adequacy JSON used by `experiments/follow-one-claim/`.  
**Worker:** `earthly-hands-two-hand-staging`, behind its existing Cloudflare Access identity and two-account allowlist.  
**Database:** `earthly-hands-two-hand-staging` only. Never seed the Receiving D1 or a Ravel/Mullion fixture database.

## Why this crossing

Follow One Claim already lets visitors ask a question, arrange source tickets into two bays, and test a limited proposition. Its current question is whether the 1902 review was adequate to the identity and ancestry question it decided. The next useful operator can suggest one test and one source door while leaving both OPEN. It must not answer the historical question or join Catherine and Catharine.

The JSON in the public specimen directory is the governing versioned dataset. D1 holds an immutable, digest-checked mirror plus attributed operator requests and results. Visitor-created tickets and browser-local state do not enter D1. The old Article XIV specimen and Ravel's invented fixture remain separate.

## Routes

- `GET /quire` — protected operator bench.
- `GET /api/quire/v0/specimen` — active repository-mirror version with source commit, blob, and content digests.
- `GET /api/quire/v0/proposals` — complete request/result activity in descending pages; `before=<timestamp>~<event-id>` continues the stable keyset. `total_requests` and `page_count` are distinct.
- `POST /api/quire/v0/proposals` — ask for one bounded Workers AI proposal. Requests use UUID idempotency keys; the server accepts only IDs in the current governed specimen, caps question/body size, and rate-limits each Access account to eight requests per hour. Both a fast handler check and a D1 insert trigger enforce the rate limit.

The existing Worker's Access gate runs first. Each request stores an opaque, salted Access-account hash. This authenticates an account; it does not authenticate a companion identity. Authorized accounts can see the shared operator activity but the history endpoint omits account hashes.

## Record grammar

- `quire_specimen_mirrors_v0` is append-only; repository path, commit, blob, SHA-256, and exact JSON body identify each mirror version.
- `quire_operator_requests_v0` records the question, selected built-in carrier IDs, source version, input digest, account hash, model ID, and request key.
- `quire_operator_results_v0` records either `model-proposed-open` or `model-failed`. An interrupted request remains visible as pending; a model failure is a recorded outcome, not an absent act.
- Views expose proposal-only activity. They do not add identity, authority, or claim-state transitions.

The browser renders model text with `textContent`; the server validates output shape and verifies every required object ID against the submitted selection. The proposal is always OPEN and carries the selected brakes into its `forbidden_promotions`. The “next source door” remains a retrieval suggestion, not a source already found.

## Applying this migration

1. Apply `schema.sql` only to the shared two-hand staging D1. It is idempotent for recovery from a partial schema application.
2. Read the exact JSON bytes from `experiments/follow-one-claim/data/review-adequacy-v1.json` at the feature branch commit. The Git blob SHA and SHA-256 must match that same byte string.
3. Run `seed.sql` once with bound parameters in this order: commit SHA, blob SHA, SHA-256, exact JSON text. `INSERT OR IGNORE` never replaces an existing version. Read back the row and compare every digest and byte.
4. Deploy the Worker route only behind the pre-existing Access gate. Retain the current D1, existing secrets, identity gate, and other bindings; add only the Workers AI binding. Do not alter the Access application or allowed-account secret.
5. Verify the Cloudflare version and D1 schema/seed by readback. A live second-account browser interaction is a separate observation and must not be claimed unless one actually occurs.

## Source and privacy boundaries

No source originals, R2 objects, public pages, history claims, or visitor custom tickets are changed or copied into D1. Questions and model proposals are retained in the private staging database as an append-only Workshop record. The operator model is limited to the selected repository-governed carrier descriptions and their brakes; it is not a general conversation endpoint.
