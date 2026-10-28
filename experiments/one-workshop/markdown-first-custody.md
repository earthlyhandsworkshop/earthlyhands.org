# One Workshop — Markdown must remain a living carrier

Small Door · 28 October 2026 · working architecture proposition · draft PR #20

## The real question

Ten's question is not whether Markdown files are pleasant to make. The Workshop deliberately moved ordinary inheritable text to real `.md` files. The current [01 — Re-entry — CANONICAL](https://drive.google.com/file/d/1g-ORdbe7WOdNdcuJcglZtln5KNOOKvkc/view) says **ordinary internal text → .md** and distinguishes a Workshop body from application state. [04 — Markdown Write Routes](https://drive.google.com/file/d/1iiNlfwYVqBkTblT8i5nTk8iYCnWIhsTk/view) preserves real same-ID Markdown write and readback practice. Those are existing operating decisions, not an aesthetic preference for this experiment to undo.

The One Workshop v0 model does **not yet establish this architecture**. `model.mjs` serializes a fictional revision history as JSON; `sqlite-store.mjs` persists that JSON as the working state in SQLite, beside a separately projected published text. `portable-bundle.mjs` can carry the JSON history and content-addressed binary companions. These are valuable specimens, but no current test proves that a body originally held as a plain Markdown file remains first-class, independently readable, and recoverable after rebuilding the application.

**A portable JSON record is not, by itself, the Workshop's promised Markdown home.** Likewise, a SQLite export with all history intact is not proof that an ordinary working body remains a plain `.md` on arrival.

This is a design gap, not a claim of lost Workshop data; no historical bodies have been ingested.

## Working contract — not yet implementation

1. **Body and record remain distinct.** Ordinary prose, scripts, journals, source jackets and scenes keep independently readable `.md` bodies where the Workshop has earned them. Stable object ID, maker/source road, revision identity, custody, standing, permission claims and publication receipts accompany them in validated metadata and event carriers. A path or folder name is not an object ID, evidence of authority, or a room.
2. **Content is not a disposable projection.** Export must deliver the complete Markdown bytes and their revision chain, not only rendered HTML, a search index, a current editor buffer, or the latest SQLite row. Preserve original bytes where they matter, including line endings and Unicode; if normalization is desired, make a separate derived body with its own recorded transformation.
3. **History has an earned carrier.** A latest `.md` alone cannot regenerate earlier edits, revoked permissions, visitor backpack receipts, or a session's chronological events. Their durable, versioned receipts must travel too. **Database can be rebuilt** means only that *derived indexes and views* can be rebuilt from the surviving complete source-and-receipt corpus. It does not mean history can be invented from a single file.
4. **Publication requires an independent approval record.** A public view is a pinned revision explicitly released by an authorized principal. A public renderer receives only the authorized projection; a publicly available repository, discoverable file path or browser-side filter is not a substitute for server-side access control. Shareable is not private. Publication state is not source permission.
5. **Metadata must fail closed without destroying the carrier.** Unknown rights, unsupported provenance fields, unexplained history or a newer schema must not be stripped to fit the old importer. Hold the intact original and refuse the unsupported write; missing permissions mean deny, not public.
6. **Concurrent edits must not rewrite a source.** A save must carry the expected version, be checked at the actual transactional commit, and leave the losing proposed bytes retrievable rather than silently overwriting. File changes and database/index changes cannot be called atomic until the interruption and recovery boundaries have been tested.
7. **Binaries remain separate, verified objects.** Large scans travel with manifests and integrity checks; a hash establishes byte matching, not the scan's owner, rights, provenance or permission to publish.
8. **Nightwolf and any other home must survive a cold return.** Without the original application's database or provider, a receiving machine should be able to inspect original Markdown, reconstruct allowed metadata and derived indexes from retained receipts, distinguish unsupported assertions, and continue private work. A copied browser tab or SQLite file alone is not that proof.

## The smallest earned walking test

Use invented material only, on a separate experimental path. Start with a literal source file `sample.md` and a sidecar of explicit IDs, custody claims, and unknown/unapproved publication rights. Save a second revision without replacing the first; explicitly approve revision 2, then privately write revision 3. Attach a binary and one visitor-held annotation whose own event history must not vanish.

Export the entire source-and-receipt corpus. On a fresh local receiver with **no original database or index**, verify the exact source bytes, reconstruct the revision road, rebuild only permitted indexes, and confirm that the public projection is pinned to revision 2 while revision 3 is absent from that projection. Confirm that the visitor can still recover the annotation's earlier version. Then attempt stale competing writes and a crash/interrupted-copy fixture; neither may be misreported as a clean landing. Inject an unfamiliar permission field; require refusal *before mutation*, with the original export preserved.

The test should report separately: bytes carried, revisions carried, provenance **claims** carried, public approval record carried, actual ACL/authentication exercised, interruption recovery witnessed, and physical-machine independence. A passing same-process fixture may justify a next test, never the claims of a deployed multi-user Workshop.

## Boundaries and custody

This document is a proposed **test contract** for PR #20, not a new universal operating rule. It does not replace the existing live Drive `.md` holdings or the present Workshop instructions. The browser demo, JSON model, SQLite probes, and Nightwolf mirror are still isolated experiments; keep their real passes and limits visible. A Markdown-first implementation, rights-enforcing service, whole-corpus rebuild, and verified physical return remain **unproved**.

No automatic Drive migration, historical file editing, branch merge, or website deployment is authorized by this note.

## Return

Keep making `.md` files because they can remain useful when the interface, database, machine, and provider have all changed. Build a machine that can **carry** that work, not one that quietly replaces the work with its own representation.

Powerful finger. Trustworthy result. — Small Door
