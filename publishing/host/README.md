# Shared publication ground · bounded constellation manifest (v0.1)

**Status:** tested source on a review branch; not installed or deployed as a public or live Workshop endpoint. A GitHub merge does not constitute a publication.

Earthly Hands should supply the things every maker needs—stable identity, source-aware navigation, access checks and a machine-readable directory—without taking over the original work, its form, maker credit or evidence.

This is a **small first shared service**, not a new constellation. A curator's existing D1 view remains the source of selection. The host returns a JSON manifest. A reading or exhibition interface can consume it while leaving every original at its own address. A work may belong to many constellations without being copied.

## Contract

The server-only function serveConstellationManifest(request, env, ctx, {registry}) handles only:

GET /folio/workshop/constellations/[trusted-slug]/manifest.json

on the protected Listening Ground Worker origin. It returns null for other paths and origins. The response contains a constellation identity, question, curator, explicit private status, and bounded references to works: slug, title, credited maker, edition, curatorial role and protected reader URL. It never returns R2 object keys, raw D1 source bodies, identity joins or publication approvals.

**The public repository contains no private registered constellation.** The maker-specific registry must be injected by a trusted deployment hand and kept in authorized Workshop custody. Do not place private view/table names, manuscripts, personal details or private source roads in public GitHub. The registryWith() helper allows many independently curated constellations without altering the common renderer. Source SQL is trusted, reviewed code, never a request parameter or visitor-supplied query.

An adapter reads a curator's approved D1 view and joins each member to the current eh_native_experiences_v1 edition and, where present, eh_work_visibility_controls_v1. Required fields: ordinal, curatorial_role, slug, title, maker, version_label, protected_reader_road, sha256, state, audience, effective_visibility (nullable), edition_sha256 (nullable). Return at most 49 rows to detect and refuse an oversized set rather than quietly discarding part of a constellation.

## Rights and security

The module requires Cloudflare Access identity, Folio email allowlist, explicit email-to-relationship mapping, and a **preexisting active** folio_memberships row in D1. It never creates or reactivates a membership. Current member records must remain private-approved at the exact current edition, with existing audience restrictions. Any conflicting visibility, missing maker or edition, changed hash, duplicate membership or untrusted URL fails the whole result. No user-supplied table name reaches SQL. Responses are private, no-store and noindex.

This is not public access control for an entire future publishing house. It provides one *private* tested boundary. A public release needs its own exact-edition permission and served-browser acceptance.

## Integration without destroying newer work

1. Inspect and reconcile the actual **deployed** earthly-hands-listening-ground Worker. At inspection, the deployed worker had newer Folio functionality than GitHub worker/src/worker.js. Never deploy the old repository source wholesale.
2. Mount this module on the narrow authenticated route in the reconciled Worker. Reuse RECEIVING_DB, Cloudflare Access ctx.access, FOLIO_ALLOWED_EMAILS and FOLIO_RELATIONSHIPS_JSON. Confirm the Folio membership is already active.
3. Privately configure an approved curatorial source view. The host does not copy its member works or decide their historical meaning. Re-run the edition and reader-link tests if membership changes.
4. Run the Node 22 tests: cd publishing/host && npm test. Then test a real permitted identity, a revoked identity and an anonymous browser; do not substitute synthetic access for actual signed-in iPhone acceptance.
5. Measure D1 rows read. A high-traffic indexed membership table may become appropriate, but do not duplicate current maker selections merely for appearance.
6. Public stable-address hosting on earthlyhands.org is a separate future crossing requiring resolved Pages/Workers routing, rights, publication permission, working original-source roads, contextual receiving and a deployment witness.

**Not provided yet:** original-document reader, global discovery and research query service, durable visitor return, successful contextual contribution receipt, rights review, archival participation, and public release. None should be claimed from this module.

**Attribution:** Small Door authored the shared host code; original works and their curatorial selection remain with their makers. The GitHub principal is technical custody, not an authenticated independent companion identity.
