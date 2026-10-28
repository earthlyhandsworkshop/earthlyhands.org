# Unrecognized browser storage — actual Chromium rescue witnessed

Small Door · 20 October 2026 first account · corrected 28 October 2026 · draft PR #20

**Standing:** A limited, **independently exercised Chromium browser-download recovery**, not a full recovery system, cross-browser claim, authenticated visitor storage, permission to deploy, or migration of historical holdings. This corrects the 20 October status that the rescue helper was wired but a browser test was still outstanding. The earlier limitation was truthful for that earlier inspection; it is no longer the current test status.

## Present source crossing

- [The experimental folio journal page](./native-folio-history-walk.html) imports [`exportUnrecognizedStoredString`](./unrecognized-storage-rescue.mjs), captures the opening `localStorage` value, and exposes a rescue download only if its saved journal fails validation.
- An unrecognized opening journal locks the import, restore, and release controls. The rescue action wraps the captured JavaScript string and storage-key label in a JSON envelope and offers it as a download. It does **not** validate, repair, rewrite, or clear the stored journal.
- The envelope preserves a browser **JavaScript string**, including isolated UTF-16 surrogate code units through JSON escaping. It makes no claim to recover original upstream file bytes or authenticate the stored contents.

## What was actually exercised

The source-controlled [real-browser test](./native-folio-browser.e2e.mjs) starts a local HTTP fixture server with the committed experimental HTML and JavaScript, launches headless Chrome-channel Chromium via Playwright, and reads the **downloaded JSON file** from disk. Its fictional damaged string contains an unmatched high surrogate.

In that test:
1. A real browser's `localStorage` is seeded with malformed journal text containing the unmatched surrogate.
2. The rescue button appears; the add and release controls are disabled.
3. The rescue is clicked, the resulting downloaded file is read independently, and `JSON.parse` reconstructs a string **equal to the seeded JavaScript string**, including that unmatched code unit.
4. The stored value is verified unchanged by the rescue.
5. A second tab then changes the storage value. Another rescue download from the original tab still carries its **opening snapshot**, not a false claim to capture the newest other-tab contents.

The same browser test also checks separate tab-conflict, reverted-bytes, failed-save, and delayed-operation guards in the folio journal; those checks are not themselves proof of the rescue envelope's broader reliability.

**Independent run receipt:** [GitHub Actions 40651930370](https://github.com/earthlyhandsworkshop/earthlyhands.org/actions/runs/40651930370), code/test commit `ebf697b9bee5544e04e844e8d27f54c9f2ace1dc`, 28 October 2026. The real-Chromium job succeeded with **7/7 reported tests passed, zero failures**, and its log explicitly reports the successful `unpaired UTF-16 surrogate survives actual browser download; stored data stays untouched` subtest. The separate Node fictional-model job also succeeded. These are results for the **draft experiment**, not the deployed public site.

## Still open

- The rescue captures the value at **page opening**. If another tab edits the storage afterward, the rescue is an earlier snapshot. The envelope does not discover, merge, or preserve the other tab's newer state.
- Browser storage remains origin-wide. A path like `/private/` does not isolate it from scripts elsewhere on the same origin. No actual visitor authentication, source permission, encrypted at-rest account, separate security principal, transactional multi-tab lock, or protected portable backup exists here.
- Other browser engines, browser permission/download failures, keyboard and screen-reader usability, interrupted downloads, device restart after data eviction, and any real visitor recovery remain untested by this browser job.
- The e2e test passes against a local server, not a public deployment, and its success does not establish original source bytes, historical provenance, or archival rights.

No historical Google Drive holdings or public site was changed by this correction. The draft must not be merged or deployed simply because this narrow test passed.

**Current distinction:** SOURCE WIRED → REAL CHROMIUM DOWNLOAD TESTED → BROADER RECOVERY STILL UNEARNED.

Powerful finger. Trustworthy result.
