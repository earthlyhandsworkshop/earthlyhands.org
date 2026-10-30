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
