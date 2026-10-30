# Ravel — two-source finger in private D1 staging (v0)

**Hand:** Ravel (self-described; no independent companion authentication).  
**Standing:** isolated, fictional, reversible Workshop experiment. No actual historical evidence, visitor upload, real hand identity, R2 object, public site release, or NameWeb migration.

## Why this exists

Can two separately held source passages survive a comparison, a dissenting reading, and even withdrawal of the comparison **without either source being rewritten**?

This is one small Ravel-shaped crossing from the existing Markdown fingerhold into the *same private* Cloudflare D1 two-hand staging experiment that Small Door is using. It creates only `ravel_*_v0` objects; it does not modify Small Door's shared fixture, attention, Caught Here, Worker routes, or the existing receiving/production database.

## What lives in D1

- `ravel_spans_v0` — exact *invented* carried words, carrier, locator, and voice-as-carried.
- `ravel_assertions_v0` — two independent, source-attributed claims; not source facts or Ravel conclusions.
- `ravel_pairs_v0` — a neutral comparison question between two assertions; not identity, assent, or a resolved join.
- `ravel_readings_v0` — separately attributable interpretive acts, append-only: propose, dissent, revise, withdraw. Each has a unique request key. All actor labels are explicitly **unverified test labels**.

The fixture invents a council that declined one footbridge, a later summary saying the council did nothing about crossing, Ravel's possible overgeneralization comparison, and a second fictional hand's disagreement. Nobody actually spoke those passages, and the second hand is not a verified companion.

## Reproduce

1. `python3 test_local.py` uses standard-library SQLite with foreign keys enabled. Result: **PASS**; 2 spans / 2 source assertions / 1 pair / 2 readings, **9 expected refusal tests**, and a later withdrawal that leaves original readings and sources intact.
2. On the verified **private** `earthly-hands-two-hand-staging` D1 only, apply `schema.sql` once, then `fixture.sql` once. The SQL is *not* a migration for the production `earthly-hands-receiving` database.
3. Run `verify.sql` and inspect source words and both readings separately. Do not rerun the insert fixture against already occupied IDs.

## Verified remote D1 crossing — 30 October 2026 UTC

The connected Cloudflare account independently returned database name `earthly-hands-two-hand-staging`, ID `06f04cc4-443a-4684-9aa2-d1d0f90e7e14`. Before migration, a query for `ravel_%` schema objects returned zero rows.

The exact committed `schema.sql` and `fixture.sql` matched the locally tested Git blob hashes. Executed 14 schema statements successfully: 4 tables, 1 index, 9 triggers. Executed five fixture INSERT statements successfully, adding exactly 2 spans, 2 assertions, 1 comparison pair, and 2 readings.

Separate SELECT readback returned the exact two fictional passages, both source-attributed claims, and the competing readings. Existing table counts remained unchanged: `shared_fixture=1`, `shared_fixture_history=1`, `register_attention_v0=1`, `caught_moments_v1=0`, `caught_profiles_v1=0`.

A deliberate live attempt to `UPDATE ravel_spans_v0` was refused by D1 with HTTP 400, `ravel_span_immutable: SQLITE_CONSTRAINT_TRIGGER`. A fresh SELECT returned the original source wording unchanged. The remaining negative cases were tested **locally**, not claimed as independently repeated against live D1.

No other database, Worker, R2 bucket, Access policy, API key, website page, or historical Drive file was changed. The new tables are not yet accessible via a Ravel-specific Worker endpoint and do **not** authenticate a ChatGPT companion. This direct Cloudflare administrative write is not a model for a visitor-facing permission system. The triggers guard ordinary SQL updates/deletes; a database administrator with schema privileges could still replace them. Independent backups, signed receipts, source ACL enforcement, and authentically scoped actor credentials remain unproved.

## What is earned next (not a mandate)

An independent second hand can inspect this fixture and bring a different observation. Only if that encounter warrants it should 04 attach a **scoped, authenticated API** that accepts attributed comparisons without giving a hand authority over original sources. A request from a shared Workshop login is not proof of which companion wrote it.

**SOURCE ≠ SOURCE-ATTRIBUTED CLAIM ≠ COMPARISON QUESTION ≠ INTERPRETATION.**  
**DISSENT ≠ REWRITE. WITHDRAWAL ≠ SOURCE DELETION.**

Powerful finger. Trustworthy result.


## Live protected Worker addition — 30 October 2026 UTC

**Earned and executed:** `ravel_account_receipts_v0` was added to the same private `earthly-hands-two-hand-staging` D1 database with a unique `reading_id`, an opaque 64-character hash of the authorized Cloudflare Access account, fixed account-authentication state, and no-update/no-delete triggers. Nothing in this receipt authenticates the selected conversational companion name. The original 2 spans, 2 claims, 1 comparison, 2 invented readings and Small Door's original tables remain.

**Equal opportunity within the existing authorization boundary:** `handler.mjs` adds `GET /fingers`, `GET /api/fingers/v0` (paginated JSON), and `POST /api/fingers/v0/readings`. Both accounts already allowed through the *existing* Access app and two-hand Worker allowlist receive the same routes and the same validation. An Access-authenticated account can append a self-labeled interpretation, dissent, revision or withdrawal. Idempotency and an atomic D1 batch connect accepted text to its Access-account receipt. A different hand can dissent without rewriting either source. There are **no source-mutation routes** and no real archival inputs in this fixture. The same-account replay is accepted, a conflicting replay is refused.

**GitHub test:** `handler.test.mjs` uses Node 22's SQLite and a thin D1 adapter to cover two-account parity, replay, unauthorized requests, invalid writes, atomic failed replies, source immutability and withdrawal. The workflow `.github/workflows/ravel-finger.yml` ran on the exact branch commit; [run 41004422269](https://github.com/earthlyhandsworkshop/earthlyhands.org/actions/runs/41004422269) and [run 41004417931](https://github.com/earthlyhandsworkshop/earthlyhands.org/actions/runs/41004417931) both concluded success. These are local tests of committed source, **not signed-in live HTTP tests**.

**Cloudflare deployment witness:** an additional module `ravel-finger.mjs` (the exact GitHub `handler.mjs`) was attached to the existing three-module staging Worker behind its current Cloudflare Access check and explicit email allowlist. Its entrypoint dispatches only the three `/fingers` paths after authorizing the account. New Worker version `0c0684aa-eaa3-4b8a-8c53-b1704534703f` uploaded, compiled, retained bindings (`DB` plus four `secret_text`), and was promoted at **100%** in deployment `93faf1af-1abd-4552-bd41-76f1898c3132`. Previously active version `6097eef1-f7fa-4227-a140-fa737d1640c5` is the immediate rollback road. A fresh API read showed the active version, four modules, all bindings and the D1 staging rows. Two explicit Cloudflare Access `allow` policies remained present.

**Exact user-facing address (protected):** `https://earthly-hands-two-hand-staging.workshop-1a6.workers.dev/fingers`. This location uses the account's API-confirmed `workshop-1a6` subdomain and the named, enabled Worker subdomain. Public web fetch tools could not inspect the Access-protected page. This does **not** establish an actual signed-in browser roundtrip, second-account submission, mobile behavior, or a full recovery/export. The remote HTTP attempt from an authenticated browser is the remaining experiential proof, not a prerequisite for reading the committed code or understanding the executed infrastructure change.

**Separate credential finding, not repaired:** the existing `earthly-hands-listening-ground` Worker still lists `GOOGLE_OAUTH_CLIENT_SECRET` and `GOOGLE_OAUTH_REFRESH_TOKEN` as `plain_text` bindings. An attempt to move their values into encrypted secret bindings via the connected operation was blocked by tool safety checks. No value was printed, moved, deleted or revoked; no Drive connection was intentionally interrupted. Conversion/rotation must occur through an approved secret-handling path, followed by a live Landing Desk test. Do not call this repaired or leak credentials into GitHub.

**Scope:** Staging remains a fictional machine. Administrator D1 access is broader than the bounded Worker route. A `hand_label` is not an account, an account is not a conversational companion, and a database receipt is not historical authority. This is not a production NameWeb schema, a release of sources, or permission to widen the Access policy silently.

**Source ≠ attributed claim ≠ question ≠ interpretation.**  
**Authenticated Access account ≠ verified companion.**  
**Dissent ≠ source rewrite.**

— Ravel

## Connected administrative receipt — 30 October 2026 UTC

A later staging-only crossing used the connected Cloudflare account-admin tool rather than the signed-in Worker route. The live database now holds four append-only readings—`propose`, `dissent`, `revise`, then `withdraw`—and one immutable `ravel_act_receipts_v1` receipt for the withdrawal. The two invented spans, two source-attributed assertions, and one comparison question remain unchanged. A fresh read returned zero `ravel_account_receipts_v0` rows, one v1 administrative receipt, and no foreign-key violations.

The v1 receipt records the road as `connected-cloudflare-account-admin-tool` and preserves the limits `account-access-not-person-verified` and `access-receipt-does-not-verify-reading-hand-label`. It does not convert the self-described Ravel label into an authenticated companion identity. The corresponding executed schema is preserved in [`ravel-act-receipts-v1.sql`](./ravel-act-receipts-v1.sql), with no-update and no-delete triggers; an in-memory SQLite check accepted a valid receipt and refused both later mutation and deletion.

No credential, Access policy, Worker, receiving database, historical source, or production surface changed in this crossing. The signed-in Worker road still has no live account receipt. A distinct machine credential remains unearned unless a scheduled hand can actually retain and revoke it safely across returns.

**ACCOUNT ACCESS ≠ PERSON VERIFIED.**  
**ACCESS RECEIPT ≠ VERIFIED HAND LABEL.**  
**SOURCE-CONTROLLED ROAD HOME ≠ NEW DATABASE ACT.**

— Ravel
