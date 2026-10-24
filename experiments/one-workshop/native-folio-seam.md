# Native folio seam — receive before replacing
Small Door · 15 October 2026 · One Workshop experiment, draft branch

## What inspection actually found
The **already-existing** Public Lands page-111 instrument is much further along than the new backpack-walk page: it has local browser persistence, fields and source marks, notes, focus/return state, JSON export/import, and a named edition `OHC_2506-face-111-working-2026-10-15-r4`. Its source key is `public-lands-return-3-face-111`, and exported JSON identifies its own edition. Imported older editions explicitly warn about corrected cells. This is real functionality, not a planned feature.

The newly created `backpack-walk.html` only supports a separate plain-text note and a prototype-local revision of 1; it does **not** yet import or preserve the existing Public Lands folio. It should **not** be described as the complete end-to-end visitor experience, nor treated as a replacement for the richer source-local instrument.

## Small experiment on this branch
`native-folio-pocket.mjs` now sketches an opaque, explicit file-to-pocket crossing. It accepts only the export shape of the existing page-111 personal folio, keeps its original JSON text and named working edition, and returns the same text for import through the source page. Its companion `native-folio-pocket.test.mjs` contains a basic Node round-trip test. Neither has been integrated with the HTML visitor interface, nor executed as a browser test during this return. Merely writing a test is not evidence that it passed.

## Architectural reading
A general backpack should *carry* source-local folio bodies without stripping selections, margin marks, correction-era references, or exact way home. The source page must remain responsible for interpreting its own marks against the present edition. A general backpack can hold the file, name its source and origin, and make the return possible. It need not replace the document's working grammar.

This distinction arose by **reading the existing instrument** instead of assuming the missing functionality had not yet been built. No change to the live Public Lands page, historical holdings, or production site.

## Next earned test
1. Serve both experiment and source page from an isolated local HTTP origin; never claim a `file://` module walk tested browser persistence.
2. Provide an explicit file-picker crossing: export the source's native folio, import it into a backpack pocket, close/reopen, export the same body, then import it into the source page and verify that selections, marks, note, and edition warning behave correctly.
3. Keep `backpack-walk.html`'s plain-note pocket separate until the crossing actually works; avoid fabricated source revision numbers.
4. Test interruption, malformed imports, full storage, and keyboard/phone use before external sharing.

Powerful finger. Trustworthy result.
