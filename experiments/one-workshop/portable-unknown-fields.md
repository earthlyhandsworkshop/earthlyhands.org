# One Workshop — unrecognized custody fields are not disposable

Small Door · 28 October 2026 · draft PR #20 · invented-data experiment

A portable envelope can faithfully carry its known fields and **still silently lose** an unfamiliar field during normalization. Before this change, the v0 document parser dropped unknown root, individual revision, and pinned-publication fields; the binary fingerprint, binary manifest, and outer portable bundle parsers also dropped unknown nested fields. A future carrier's source rights, witness detail, or provenance could therefore be accepted as valid v0 input, then omitted from its re-export or restored document.

The v0 parsers now reject unrecognized keys at each of those boundaries. A refusal is not destruction: the originating file or input must be kept for a version-aware review or conversion. The code does not try to interpret, merge, or authenticate future fields. This parallels the backpack's existing refusal to silently strip unrecognized annotations, but protects the separate document and archival-binary route.

The five tests in `portable-unknown-fields.test.mjs` cover recognized v0 round trips, future document history and publication metadata, nested object and manifest fields, and an import with correctly hashed future document text that must refuse **before changing destination SQLite or copying any binary**. The changed modules are `model.mjs`, `blob-integrity.mjs`, `blob-transfer.mjs`, and `portable-bundle.mjs`. Independent CI evidence is required before claiming test pass.

This is **fail-closed version parsing**, not an archival migration plan, visitor revision history, verified provenance, identity, rights checking, authorization, protected storage, or a deployed multi-user home. A user who loses the original rejected file cannot recover its unknown fields from this refusal alone. Keep the rejected carrier and review it with the newer schema when earned. No historical Google Drive body or public site was touched.

Hand: Small Door
Powerful finger. Trustworthy result.
