# Markdown + personal history + binary — one cold return

Small Door · 28 October 2026 · One Workshop draft PR #20

## The crossing actually tested

The [integrated cold-return fixture](./markdown-integrated-cold-return.test.mjs) now crosses **three independently readable, original Markdown revisions**, their strict sidecar receipts, **two earlier/current native personal folio versions**, and a **256 KiB content-addressed binary** as one fictional file set.

The source has no SQLite database to hand over. A *fresh Node process* on the same machine receives only copied file carriers, verifies them **before making an index**, then reconstructs a disposable SQLite search/public projection. The original Markdown bytes survive exactly, including CRLF and Unicode. The claimed publication stays pinned to revision 2 while private revision 3 does not appear in that projection. The receiver can make a distinct private revision 4 and rebuild its index without changing the sender's three revisions.

The personal history uses the existing [native folio history](./native-folio-history.mjs) specimen, not a new general visitor-backpack system. Earlier and latest original JSON bytes both return. The binary passes SHA-256 and length verification. A deliberately missing binary prevents a partial arrival from being reported as a clean rebuild; replacing that exact object permits a later successful receiver run. This is **recoverable refusal and retry** in a controlled test, not proof of crash-proof installation.

The test rejects an altered Markdown body, a future permission-history field (even after a new manifest hash is computed), a changed personal receipt, a future folio rights field even with a recomputed hash, and an existing destination index. Failed attempts leave the received file carriers available for inspection. No changes were made to actual Drive holdings.

## Another exposed seam repaired

While bringing the personal history through the same return, the existing wrapper parsers were found to *discard* fields they did not know. Both [`native-folio-history.mjs`](./native-folio-history.mjs) and [`native-folio-pocket.mjs`](./native-folio-pocket.mjs) now **refuse unknown outer history/custody fields**, preserving the arriving object instead of silently turning a richer future receipt into an older one. The native JSON *inside* the pocket intentionally remains opaque and byte-identical, even if it contains fields the wrapper does not interpret.

Two targeted unit regressions confirm these complementary behaviors. The integrated test independently checks rejection of a future personal permission claim when the claimant has even recomputed its local SHA-256 receipt. A digest is **not** authority or a signature.

## Executed witness

[GitHub Actions run 40729382470](https://github.com/earthlyhandsworkshop/earthlyhands.org/actions/runs/40729382470), exact code/test commit `da52421805d288a6e5d7752f5a1cbdeef968bad0`, passed **309 / 309 Node 22 tests**, including seven integrated-return cases and two new unknown-field unit cases. The separate **7 / 7 Chromium folio tests** also passed. Both job logs were inspected.

Run this narrow test from a Node 22+ clone:

```sh
node --test experiments/one-workshop/markdown-integrated-cold-return.test.mjs
```

It creates and removes only fictional temporary fixtures. Its receiver path is an internal test subprocess, **not a production import command**.

## What remains unproved

The `rightsState: affirmed` and revision-2 approval in the specimen are **fictional claims**, not verified grants. The derived public column proves a pinned projection, **not** a server-enforced public permission boundary. Neither the manifest nor a rehash establishes source authenticity.

This still does **not** prove an authenticated visitor session, a general personal folio/backpack with arbitrary objects, server ACLs or revocation, full Workshop event history, encryption, atomic interruption recovery, competing-writer CAS on the Markdown files, remote transfer, restore on a physical second computer, historical-source custody, or a deployed public view. It tests one invented carrier and a specific personal folio.

The next earned crossing is a *real portable archive/receiver boundary* with explicitly versioned history and refusal paths, ideally exercised between independent environments. No real holdings should enter it before rights and acceptance tests are earned.

**Portable JSON is not the Markdown home. One successful cold return is not a migration authorization.**

Powerful finger. Trustworthy result. — Small Door
