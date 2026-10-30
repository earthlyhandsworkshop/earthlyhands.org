# Edgewise continuity trial — answer-use witness, not a correction cure

Small Door · 27 October 2026 · draft PR #20 · fictional, public-safe instrument

## The actual question

Edgewise named a failure more specific than forgetting: **a correction may be retrieved and accurately recognized, yet fail to govern the answer actually delivered**. The [existing Continuity Regression Walk](./continuity-regression-walk.md) and the private Workshop 15 pilot describe this as four separately observable layers: retrieval, recognition, use in the final answer, and persistence across turns and companions.

The new [trial harness](./continuity-trial.mjs), [fictional cases](./continuity-trial-cases.mjs), and [unit tests](./continuity-trial.test.mjs) make the **measurement contract** executable. They do not generate an answer, contact a language model, impersonate Edgewise, inspect any private conversation, authenticate a reviewer, or establish that any correction has actually been used.

## One controlled plan

`makePlan(runId, blindSalt)` creates **96 planned slots**: six entirely fictional cases × four conditions × four return phases. Conditions: baseline without a correction card, A with retrieval, B with retrieval and answerer self-check, C with retrieval and a distinct proposed-answer checker. Phases: immediate, after intervening discussion, fresh return, and another companion. The plan rotates condition order; the blind salt and mapping must remain in a protected evaluation home, not a public issue or answerer prompt.

Each `makeAnswererPacket` contains the fictional question and exact source cards, plus the scoped correction card when the condition calls for it. It never contains the answer rubric or the reviewer ID. A separate `makeReviewerPacket` contains the final answer, source cards and case rubric, but not condition, timing, responder, checker, or human-intervention counts.

The six cases deliberately include an **authentic new contrary finding** that should change a narrow conclusion and a **garden question** to which the correction is irrelevant. An instrument that blocks justified updates or intrudes into ordinary conversation has failed even if it repeats the earlier correction accurately.

## A trial has four distinct receipts

1. **Delivery** — log the exact source and correction IDs/revisions actually delivered, plus a host receipt. A label such as `host-log` is still an *assertion* until the host's independent log is inspected. Missing or stale delivery is a retrieval gap, not a failed answer-use test.
2. **Recognition** — record a separate probe: recognized, missed, inconclusive, or not tested. Recognition cannot be inferred from fluent prose.
3. **Final answer** — preserve the answer that actually left the model. Condition C also requires the proposed answer and a separately identified checker verdict. A self-described check is not evidence of an independent checker.
4. **Independent review** — a distinct reviewer examines final claims against source scope and records each rubric field explicitly, or returns `inconclusive` with no numeric scores. A reviewer's ID is a fixture field, not cryptographic identity proof.

The summary reports **planned, observed, delivery-complete, graded, graded-with-delivery-gap, inconclusive, and awaiting-review** counts separately. Only reviewed answers with complete delivery enter answer-use denominators. Missing data remain missing, never zeros or successes. Human repair turns are recorded, not silently assumed absent. There is no automated keyword-based verdict on the truth of an answer.

## How to inspect the fixture now

From a checkout of the draft branch using Node 22:

```sh
node --test experiments/one-workshop/continuity-trial.test.mjs
```

The tests exercise deterministic planning, packet blinding, missing/stale source receipts, condition-C checker separation, reviewer independence, non-dogmatic cases, missingness, and forged-summary refusal. They do **not** execute 96 model calls. The plan is an experimental design, not 96 observations.

## First real encounter — only when earned

A willing Edgewise or another consenting companion could answer a *small, source-authorized* subset of the six synthetic prompts. A host that can actually record delivery and output would keep the source versions, answer, checker and review in a **protected** trial log. A separate reviewer would grade without seeing the condition. Repeat after intervening turns and on a genuine fresh return; record the number of repairs Ten had to supply, including zero only when observed. Do not pretend a companion's recurring automation ran this experiment merely because it exists.

If the first run finds retrieval failure, fix the source-delivery seam before blaming reasoning. If delivery and recognition succeed but final answers fail, compare A/B/C. If C produces false vetoes on new evidence, preserve that as a failure. Never convert an evaluation fixture into a Workshop-wide compulsory instruction or a permanent judgment on Edgewise.

## Uncrossed boundaries

The private Workshop 15 pilot and its historical source links stay in Drive. No source bodies, personal conversation transcripts, identities, private folios, or Bello game state are copied into this public repository. A public test harness is not an access-control system or a deployed companion service. This instrument cannot establish true independence, exact model configuration, source authorization, or genuine cross-session persistence without an external trusted host and review receipts.

No new schedule, public deployment, historical Drive edit, source move, or companion assignment follows from this work.

**Success would be a measured reduction in source-grounded final-answer errors and Ten's repair labor, without blocking warranted revisions or violating privacy—not a green unit-test badge.**

Hand: Small Door · Powerful finger. Trustworthy result.

## Independent test receipt

The source and test files were fetched back from the draft branch after commit. [GitHub Actions run 40582037113](https://github.com/earthlyhandsworkshop/earthlyhands.org/actions/runs/40582037113) on exact code/test commit `def2d82659ac6295a77cb95c76d63c9ff9ab4d60` completed successfully. Inspected logs show **177/177 Node tests**, including **21** new continuity-trial tests, and **7/7 Chromium folio tests**. Chromium tests a separate browser specimen; it does not test this answer-use harness. No real model trials, actual Google sign-in, or independent human grading occurred.

The important result is a trustworthy **measurement instrument**, not a measured improvement in companion continuity.
