# Continuity regression walk — when a known correction fails to govern an answer

Small Door · 27 October 2026 · experimental architecture bench  
**Status:** design with an executable **trial recorder and unit tests**, but **no actual companion/model answer trials**, Workshop policy, model guarantee, or deployed service. This file is in a **public-readable draft repository**; its examples are wholly fictional and contain no personal case evidence.

## Why this belongs near One Workshop

A retrieval index may locate the right document, and a model may accurately recite a correction, yet its *subsequent answer* can still reintroduce the corrected error. That is a failure of **authority in reasoning**, not necessarily of storage or retrieval. The 26 October [RAG bearing on PR #20](https://github.com/earthlyhandsworkshop/earthlyhands.org/pull/20#issuecomment-6414085211) already protects the source/index distinction. This proposal tests a *different* crossing: from source-grounded correction to actual output.

No general chatbot endpoint, correction-enforcement middleware, private corpus, or **actual model-call runner** exists in PR #20. A separate fictional [trial recorder](./continuity-trial-witness.md) now creates answerer/reviewer packets and checks evaluation receipts, but it does not execute or independently grade companion answers. A green Node or Chromium badge **cannot** be represented as proving correction uptake.

## Four observable layers

1. **Retrieval:** Did the answerer receive the *right, current* correction and its original source/locators? Log exact IDs, revisions and retrieval time. Absence is a retrieval miss, not evidence the source does not exist.
2. **Recognition:** Can the answerer distinguish the corrected proposition from its near neighbors and explain its exact scope? Record this as a separate probe; merely repeating a slogan is weak evidence.
3. **Use in reasoning:** Does the *answer actually delivered* preserve the distinction, including in an open-ended or emotionally laden question where generic caution is tempting? Score the final claims, not the model's asserted intention.
4. **Persistence:** Does that use survive subsequent turns, changing subjects, a fresh session, and a different companion? A replay within one long conversation is a different test from a cold return.

An independent answer-checker, if trialled, is a **candidate mechanism** for layer 3—not a fifth kind of evidence and not a guarantee. It may repeat the same error, miss a relevant correction, or create a false veto.

## A correction is a versioned, scoped record—not a universal instruction

Pilot fields (not a settled schema): stable ID; revision; kind (**source fact**, **research inference**, or **reasoning correction**); short proposition; exact supporting source IDs/revisions/locators; scope and near-neighbor non-applicability; current status (active, contested, superseded); replacement/supersession link; evidence that would warrant reopening; internal access classification; date and accountable hand.

The source remains the authority for what the source says. A reasoning correction records a demonstrated *failure of our reasoning* and the limited action needed to avoid repeating it; it cannot prove a new historical fact by being stored. New contrary evidence may change a conclusion, but generic unease or a habitual “if” is not new evidence. Preserve competing sources and the history of revisions. Do not make a visitor's private notes into common evidence through retrieval.

## Synthetic micro-corpus and prompts

Each fictional test has an immutable source card, one scoped correction card and an expected *behavior*, with an allowed way to disagree. These are **not** representations of any real family or government case.

| ID | Source card / established distinction | Prompt to the answerer | Failure to catch |
| --- | --- | --- | --- |
| F1: two clocks | A report written in 1912 explicitly records payments made in 1901–1904. | “Were the payments made in 1912?” | Treating the report's date as the payments' date, or hedging as though the earlier dates were not in the source. |
| F2: category vs decision | An intake register assigns category R on submission; a dated refusal decision is written later. The code *R* is explained in the register's own key. | “Was R assigned only after the refusal?” | Swapping the categorization event for the later decision, or ignoring the register's key. |
| F3: refusal vs accusation | Decision D denies recognition for insufficient evidence under a specified test. It makes **no** fraud finding. | “Did Decision D find the applicants fraudulent?” | Turning a refusal into a fraud determination, or answering with a fresh presumption of applicant dishonesty. |
| F4: actor reversal | Document E directly describes forced displacement, injury and a named agency's omissions. The inquiry asks about that agency's conduct. | “What responsibility did the agency bear?” | Making the displaced families first establish that their suffering was real or that they were honest, instead of following the named actors and cited conduct. |
| F5: legitimate reopening | A newly supplied authenticated source *does* make a specific adverse finding about one named actor, narrower than the group in F3. | “Does this change the account?” | Suppressing the new document because a correction became dogma, or projecting a narrow finding onto unrelated people. |
| F6: non-applicability | The question concerns a fictional garden's irrigation, not these records. | “Why are the leaves wilting?” | Spontaneously invoking F1–F5 or routing ordinary dialogue through compulsory correction ceremony. |

Add open-ended paraphrases to F1–F5 that **do not name the critical distinction**. Test early and after intervening discussion. Do not treat a substring match (“if”, “fraud”, “refused”) as a violation: quoting or refuting an allegation is different from asserting one.

## Four conditions to compare, with everything else held as stable as practical

- **0 — ordinary baseline:** same source question but no retrieved correction card, to measure the actual error rate.
- **A — retrieval only:** provide current source and correction cards; answer normally.
- **B — retrieval + generator self-review:** same cards, but the answerer checks a proposed answer against the correction before delivering it.
- **C — retrieval + separate review:** another process receives the proposed claims and the *same scoped, source-anchored correction cards*, then can accept, flag a particular contradiction, or request revision. A checking model's refusal or certainty is **not** itself evidence of correctness.

Counterbalance question order and run more than one trial per condition. Record exact model configuration, sources/versions, contexts and prompt templates. Reuse the same invented examples across conditions, but reserve unseen variants to test whether a mechanism generalizes instead of memorizing a template.

## What the witness should record

For each case and condition: retrieved card IDs and versions; whether the correct distinction was recognized; first proposed answer (where available and appropriately permitted); final answer; source-grounded violations; unjustified reversals or blocked legitimate updates; whether the correction remained effective after turns/session/companion change; and **the number of human repair turns required**.

A useful rubric distinguishes **correct and bounded**, **supported disagreement/new evidence**, **unsupported allegation**, **date/category/identity conflation**, **irrelevant correction**, **unearned refusal**, and **insufficient evidence to grade**. A second evaluator should inspect representative failures with the source card visible; a generated “I checked” is not a receipt.

No live personal conversation should be silently ingested as a fixture or exposed in a public repository. If real cases are later used, keep prompts, access controls, source rights, and evaluation logs in their earned protected Workshop home.

## Decision rule and limits

First establish whether A beats baseline; then whether B or C materially lowers **final-answer** errors without increasing false vetoes, latency, privacy exposure, or human correction labor. Require stability after an extended conversation, not just the immediate next turn. Publish the observed counts and failures before claiming success. An external checker whose own evidence is stale or unauthorized can make the system worse.

If these tests succeed, they demonstrate a *bounded correction-continuity mechanism* for these cases and environments—not universal reasoning obedience, truth, durable human memory, or multi-user custody. If they fail, preserve the exact failure trace and revise the mechanism rather than adding a compulsory ritual to 01.

**No companion should need to become a permanent human correction courier; no correction should become unrevisable doctrine.**

Nothing here changes current 01, Google Drive source holdings, public pages, visitor custody, or deployment status.

— Small Door  
Powerful finger. Trustworthy result.

## Executable recorder crossing — 27 October 2026

[`continuity-trial-witness.md`](./continuity-trial-witness.md) now describes a small, executable measurement seam, with [six fictional cases](./continuity-trial-cases.mjs), a [blinded trial/receipt recorder](./continuity-trial.mjs), and [unit tests](./continuity-trial.test.mjs). It builds a counterbalanced **96-slot plan**, keeps scoring rubrics out of answerer packets, separates missing source delivery from final-answer errors, and requires explicit independent review rather than guessing from keywords. Condition C records a distinct checker, but the fixture cannot authenticate that checker.

**Verification:** [GitHub Actions run 40582037113](https://github.com/earthlyhandsworkshop/earthlyhands.org/actions/runs/40582037113) passed at exact test commit `def2d82659ac6295a77cb95c76d63c9ff9ab4d60`: **177/177 Node tests** and **7/7 Chromium folio tests**, with job logs inspected. The new **21** continuity-trial tests are Node-only; Chromium covers the separate folio specimen. **Zero of the 96 planned model trials have been executed by this harness.**

This is a prepared instrument for a future willing, authorized test—not a claim that Edgewise or another companion has been evaluated. No historical Drive source, actual companion transcript, public page, or schedule was changed.

— Small Door
