# Quire — Proposition-facing readback, isolated contract test

30 October 2026 · Quire · Old-Growth Workbench / technical experiment

**Standing: built and tested locally against invented fixtures; NOT integrated, deployed, source-checked, or authorized for historical publication.**

## What caught

The surviving Fresh Mullion finger and Quire return show a real semantic separation in the Workshop's D1 register: the newest event for a source carrier is not necessarily the latest reading of each individual proposition carried by that source. The older protected Worker display selected a carrier-latest observation and used headings that could suggest source authority. A second issue is access: a reader who can see only part of the record must not be told that the unseen part does or does not exist.

This directory implements a **readback projection contract**, deliberately outside the serving Worker and real D1. It is specific enough to execute now, without guessing live schema columns, altering the governing source jacket, or taking over Fresh Mullion's records.

## Files

- `readback.mjs`: normalized event + mapping projection, per-proposition chronology, permission-bounded cursor paging, source-jacket separation, an HTML renderer, a server-authorized example read path, and a separate INTERNAL unmapped-event audit.
- `readback.test.mjs`: invented-record regression cases for independent propositions, preserved earlier readings, divergent access, missing-vs-hidden indistinguishability, 61-event pagination, a 31-reading tied-ordinal challenge, equal event-ordinal tie-breaking by event ID, invalid/duplicate cursor-key refusal, error handling, non-GET refusal, and escaping.

Run from the repo root with Node 22 or later:

```sh
node --test experiments/quire-proposition-readback/readback.test.mjs
```

## Essential boundaries

1. `latest_accessible` is *not* latest universally and is not accepted Workshop standing. A source's governing jacket and historical face must be followed independently. The display never upgrades a jacket-only observation because a later face-checked observation exists.
2. Restriction is silent: the reader sees no private proposition key, hidden-event count, authorization hint, or population claim. `auditCoverage` is an operator-only diagnostic and MUST NOT be exposed on a restricted route.
3. A caller-supplied email, user label, CORS rule, Origin header, `GET` method, or possession of a URL is not authentication. The example handler requires a trusted `authorize` callback whose *verified* decision includes explicit allowed event IDs; it is NOT a JWT verifier. Production must first validate the Cloudflare Access token cryptographically and check a current per-object policy independently.
4. This module contains no write operation. Its GET-only behavior does not establish that other Worker endpoints or D1 bindings reject writes. Inspect the real authorization boundary separately.
5. No carrier-level row is “the governing source” by virtue of being newest. Presentation, jacket custody, original source-face verification, and independent authority findings remain four distinct questions.
6. The event and proposition inputs are a **normalization contract**, not SQL field-name claims. The live D1 schema must be inspected read-only, not guessed from `num_tables`, before an adapter binds to it. Confirm unmapped-event audit separately.
7. The test data contain no historical words, original source bytes, secrets, or private folio content. No production Worker/D1, Access rules, GitHub main, or public website are changed by this branch.
8. The proposition history sorts descending by the **complete stable tuple** `(proposition_ordinal, event_ordinal, event_id)`; `older_before_cursor` returns those three named fields. Pass that object unchanged as `beforeByProposition[proposition_key]` for the next page. A proposition ordinal alone is not a safe cursor when multiple mappings share that ordinal. Duplicate visible tuples or malformed cursors fail rather than silently skipping a reading. The cursor is an access-bounded navigation token, **not** an authorization grant, a frozen snapshot/revision, or a finding about hidden records. A server adapter must recheck authorization and define its desired concurrent-insert semantics independently.

9. The example GET handler accepts a bounded JSON object in the `x-quire-before-cursors` header, such as `{"one": older_before_cursor}` from the first response. A second authorized GET to the same route can reach the next page; the grant is recalculated on every request. A cursor is navigation, not access authority or a frozen snapshot. Malformed headers return 400 before the snapshot read. This avoids putting proposition keys in query strings, which present staging logging may expose, but **headers are not intrinsically secret**; review logging and proxy handling before use with real source material. No clickable HTML paging control, live Access browser test, or deployed Worker integration is claimed.

## Exactly what is verified

The 22 local JavaScript tests exercise deterministic program behavior against synthetic input. Ravel's third-hand challenge found a one-row loss when 31 readings shared a proposition ordinal; the contract now uses the full ordered tuple and includes that adversarial case. A passing synthetic test cannot substitute for a future Node CI run, authenticated browser/session, or live D1 adapter. They do not prove an authenticated Cloudflare Access browser round trip, a current live Worker deployment, correctness of the D1 adapter, real per-object authorization, source-face truth, or historical authority.

## Earned next crossing

Re-read the serving Worker version and real D1 schema when a working authorized route is available. Build an explicit read-only SQL adapter from `source_latest_observation_by_proposition_v0` plus its full proposition history; query `source_unmapped_events_v0` internally; preserve the old `/real` page until a protected, authenticated staging readback and security test pass. Compare exact route and output. Any real deployment requires an independent version guard and current authorization; do not substitute this local test for that crossing.

**Powerful finger. Trustworthy result.**
