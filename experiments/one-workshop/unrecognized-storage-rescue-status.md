# Unrecognized browser storage — helper wired, browser test outstanding

Small Door · corrected 20 October 2026 · draft PR #20

**Standing:** Current branch evidence, not a claim of completed browser recovery or permission to merge or deploy. This replaces the stale 18 October assertion that the JSON helper was not connected.

## What is now present

At inspection of branch `experiment/one-workshop-foundation-2026-10-14` (head `d904c5b2c6ffecc1ad15eeee5f62fd781d96f399`):

- `native-folio-history-walk.html` imports `exportUnrecognizedStoredString` from `./unrecognized-storage-rescue.mjs`.
- On a journal validation failure at page opening, the page locks import/release operations and exposes a download-only rescue button for the captured `localStorage` string.
- The rescue handler calls the helper and downloads `public-lands-face-111-unrecognized-browser-storage.json` as `application/json`, rather than wrapping the damaged JavaScript string directly in a plain-text Blob.
- `unrecognized-storage-rescue.mjs` serializes the captured JavaScript string inside a JSON envelope alongside a schema and storage-key field. JSON escaping is designed to preserve unmatched UTF-16 surrogate code units that a plain-text Blob would otherwise replace.

**This is code-level wiring, verified by reading the actual branch files.** The earlier statement “helper committed but not connected” is no longer true. The helper's promises and browser behavior have not thereby been independently demonstrated. It preserves the string read from browser storage, **not** the original bytes from any upstream source.

## The real uncompleted crossing

Perform an independent browser interaction and downloaded-file test, using only invented damaged content:

1. Seed the specimen's exact `localStorage` key with an invalid journal string containing an unmatched high surrogate, then load the page.
2. Confirm that the raw rescue control appears while imports, restoration, and clearing remain locked.
3. Download the resulting JSON file, read its bytes independently, parse the envelope, and compare the recovered string **code unit by code unit** with the seeded string (including the unmatched surrogate).
4. Confirm that attempting rescue does **not** rewrite or clear the stored value.
5. Check behavior after a second tab changes storage after the first tab's initial read: the offered rescue is the **opening snapshot**, not a claim to capture the other tab's latest value.
6. Check failures of download/storage access, keyboard operation, and major browsers as justified by the actual visitor use. A successful rescue does not validate, repair, or authenticate the damaged journal.

No successful independent end-to-end browser download is recorded by this note. A JavaScript round trip or a source-code reading is not that test.

## Larger boundaries remain

The specimen uses origin-wide `localStorage`, not isolated visitor storage; path separation does not create origin isolation. No multi-user transactional store, visitor authentication, rights enforcement, access control, encryption, production durability, or deployed recovery service exists here. Do **not** merge or deploy PR #20 on this basis. Historical Google Drive holdings remain untouched.

This correction is deliberately narrow: **implementation present; tested recovery not yet established.**

Powerful finger. Trustworthy result.
