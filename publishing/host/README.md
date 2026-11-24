# Earthly Hands · Shared Constellation Host — private source module

**Standing:** tested source, not deployed. Does not implement a public release or confer public permissions. The current protected Folio Worker must be inspected/reconciled before mounting this module. `worker/src/worker.js` in GitHub was **older** than the live Cloudflare Worker when inspected on 23 November 2026; deploying it wholesale would risk removing newer Folio behavior.

This is the common *ground* for a maker's constellation. It provides a stable private reader route, an accessible responsive shell, identity and maker credit, ordered source-backed member roads, a bounded JSON manifest for future reading/search services, and a contextual email draft. It deliberately does **not** own the member works, impose their page design, interpret their history, or register a new public artwork.

## Interface

A trusted publication hand supplies a **private, code-reviewed registry** of constellation definitions to `servePrivateConstellation(request, env, ctx, { registry })`. The public repository contains an empty registry by default. This is intentional: protected view/table names, members, editions and routes must not be embedded in publicly accessible source control merely to enable a demonstration.

The handler has two protected, read-only responses for every registered slug:

- `GET /folio/workshop/constellations/<slug>/` — lightweight HTML visitor footing, links to independently authorized native works, maker credit, and ordinary browser Back; does not copy works.
- `GET /folio/workshop/constellations/<slug>/manifest.json` — an explicitly private, no-store manifest with curator, question, member titles, roles, editions, and current protected links. No R2 keys or hidden source objects in JSON.

Use `curatedViewMembersSql(reviewedViewName)` from `registry.mjs` to construct the same bounded read for each maker's approved D1 selection view. Only a trusted deployment editor may supply that view name; it is never taken from visitor input or committed with private content in public GitHub. The builder joins each selected member to the **current** `eh_native_experiences_v1` edition and, where present, `eh_work_visibility_controls_v1`. It selects `LIMIT 49`, allowing the host to reject more than 48 members rather than silently truncate. No work content is copied or taken over by the host. The view must supply `ordinal`, `curatorial_role`, `slug` and `protected_reader_road`. The required result fields are `ordinal`, `curatorial_role`, `slug`, `title`, `maker`, `version_label`, `protected_reader_road`, `sha256`, `state`, `audience`, `effective_visibility` (nullable), and `edition_sha256` (nullable). See synthetic tests for shape. Member reader URLs must be their *exact* current protected native Folio addresses. The first pilot can use an existing maker-curated private seven-work view without copying its rows or changing its maker, but the **selected view name and the private registry remain in private custody** until reviewed. A registered work's private JSON manifest now includes its current 64-character `edition_sha256`, allowing a future authorized reader to tell an exact edition change from an unchanged title. The hash proves bytes only when compared against a separately verified R2 object; the manifest's hash is not an archival truth or publication grant.

### Integration boundary

1. Obtain the **actual deployed** Listening Ground Worker source and reconcile it with GitHub. Do not overwrite a newer worker version, existing response routes, or schedules.
2. Bind this module through a narrow route handler before the generic 404. The site must use the live `RECEIVING_DB`, `FOLIO_ALLOWED_EMAILS`, and `FOLIO_RELATIONSHIPS_JSON`, plus the existing authenticated Cloudflare Access `ctx.access` identity. No anonymous fallback.
3. Register a maker's approved **private** adapter through a trusted configuration read by the Worker, not via an HTTP query, user-supplied SQL or a public registry. The `registryWith()` helper validates basic identity and prevents duplicates; the caller still must review SQL and privileges.
4. Run `npm test` under Node 22. Then test the real protected reader from an authorized account and an unauthorized account. Repeat with a revoked Folio membership. Confirm no private manifest leaves over shared caches or any CORS route.
5. Follow one member work, return with browser Back, and inspect page position on a real iPhone. The host itself is static; true cross-device return and new contribution acceptance are **not** implemented by this module.
6. Publication to `earthlyhands.org` is an **independent future crossing**. Reserve the final stable canonical address only after the public host router, maker signoff, image/source rights, exact-edition gate, contextual receiving, and public browser witness agree. This private prototype path is not a promise of a live public URL.

### Fail-closed decisions

- Before any work query: require Cloudflare Access identity, allowlisted email, explicit mapped Folio relationship, and **already-active** matching `folio_memberships` record. This service does **not** reactivate or create a membership when someone visits.
- Unknown slugs, unexpected methods, querystring changes, or domains outside the protected Worker do not return work data.
- Missing, duplicate, held, changed, public-drift, unsafe or invalid member records fail the entire reader, rather than silently skipping an important work. A private member's effective visibility row may be absent; if present it must say `private` and match the same edition hash.
- At most 48 members are accepted; adapters must fetch `LIMIT 49` so over-limit results are detected, not silently truncated. Large constellations will need pagination in a separately reviewed v2.
- Trusted adapter SQL is conservatively restricted to one short SELECT statement; this is not a replacement for review of the named D1 view.
- Work titles, role labels, edition labels and maker credit must be present and bounded; changed or malformed text refuses the complete constellation.
- Data-derived HTML strings are escaped; keyboard readers can skip directly to the member works. All returned protected links must point exactly to their slug on the existing Folio origin. Responses are no-store and noindex; CSP refuses scripts and network calls.
- An email draft is not a submitted/received archival contribution. Source permissions, historical certainty, visitor state persistence, upload/reply receipt, editable relationships, live public rights and public access are **separate features**.

## What this does *not* solve

This module does not create a new D1 schema, publish private material, merge Quire's seven works, answer a contested Robert Bell identity, provide global person/place search, or replace Glean's reader or Quire's curation. Its major infrastructural value is a common **trusted host contract**: the next constellation can inherit the same access, metadata, reader footing and safety checks while preserving its own style and maker.

An existing seven-work private source view is a useful pilot but currently has a relatively expensive inherited discovery-view join. Measure D1 rows read before high-traffic use; a future indexed, first-class constellation membership table with maker-controlled revisions can improve scale without freezing curatorial decisions. Do not introduce that schema solely to make the first private test appear grander.

**Authorship:** shared host module — Small Door; independent curatorial selection and member works remain credited to their actual makers. This commit is through the shared GitHub technical principal, not an independent authenticated Small Door login.
