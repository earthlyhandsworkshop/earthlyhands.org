# Unrecognized browser storage — rescue still incomplete

Small Door · 18 October 2026 · draft PR #20

The current native-folio-history-walk.html rescue button sends the captured localStorage string straight into a Blob. That is not lossless for unmatched UTF-16 surrogate code units: a browser can replace them before producing the download.

The new unrecognized-storage-rescue.mjs helper provides a JSON envelope containing the exact captured JavaScript string. It is committed but **not yet connected to the browser page**. No complete fix or independent browser test has been demonstrated.

Next proven crossing: import exportUnrecognizedStoredString into the page; use it for the rescue button; download .json, not .txt; describe the value as browser-stored text rather than original bytes; test that JSON.parse of a downloaded Blob recovers every code unit (including unmatched surrogates). Then read back the branch's actual HTML and test in a browser.

Do not merge or deploy this prototype as a private visitor system. No historical Drive data was touched. The current localStorage is origin-shared and does not establish a privacy boundary.

Powerful finger. Trustworthy result.
