# Two hands, one fictional page — live D1 crossing (NOT DEPLOYED)

## Current crossing — 29 October 2026 (replaces older unverified status below)

**Evidence received from Ten's Cloudflare D1 Console:** Ten ran the fixture SQL, then pasted a result containing the exact invented body `Two hands, one invented page. Nothing here is historical source.` with Cloudflare query timings. This is credible **account-side readback of the fictional page**, not independent connector access. The pasted output did **not** show `id`, `version`, the history table, or the trigger; those details remain to be checked. Do not re-run migration just because an older paragraph in this README says the SQL has not run. Ten separately supplied D1 database ID `06f04cc4-443a-4684-9aa2-d1d0f90e7e14`; it was committed and read back in this isolated branch's `wrangler.jsonc`. The ID's association with the intended D1 database has not been independently verified. No staging Worker deployment or authenticated two-device encounter has been verified.

**Current Cloudflare dashboard crossing:** Ten reached Workers & Pages → Create → "Make something new" and showed the **Continue with GitHub** option. The new Git-connected Worker must not accidentally use the default branch or the public site's root. Before any **Save and Deploy** action, check all of:

- Repository: `EarthlyHandsWorkshop/EarthlyHands.org` (the Workshop GitHub connection).
- Selected production/source branch for this *distinct staging Worker*: `experiment/one-workshop-foundation-2026-10-14`, **not `main`**. Git's default may otherwise select `main`.
- **Root directory:** `experiments/one-workshop/two-hand-cloudflare` (the directory containing this experiment's `wrangler.jsonc` and `worker.mjs`), not the repository root or public `worker` directory.
- **Worker name:** `earthly-hands-two-hand-staging`, matching `wrangler.jsonc` exactly. No existing Worker should be selected or overwritten.
- **D1 binding:** `DB` to the *new staging* database. Never use `RECEIVING_DB` or the existing `earthly-hands-receiving` database.
- **Build/deploy:** `npx wrangler deploy` is the usual deploy command *when* the root is correctly set; no public-static-site build command. The effective Wrangler version and its handling of required secrets still need a real build check. **Git connection is potentially an automatic deployment pipeline**, not merely a repository pointer: after initial deployment, further pushes to this active draft branch (including ordinary documentation edits) can redeploy the Worker. Before enabling builds, use explicit build-watch paths for the experiment files, determine whether builds can be disabled/held until deliberate approval, and do not keep making routine branch edits against a live auto-deploying staging service. Even watch paths cannot stop a matching source-code edit from auto-deploying. Avoid selecting an existing public Worker.
- **Before a reachable test:** Cloudflare Access must protect the entire new Worker (including `workers.dev` and previews) with only two consenting test identities, and both secrets `TWO_HAND_ALLOWED_EMAILS` and `TWO_HAND_ACTOR_SALT` must be configured privately, never committed or pasted into chat. Missing `ctx.access` fails closed in the present Worker, but that is a *second* guard, not a substitute for perimeter Access. Wrangler's `secrets.required` may reject a deployment until the secrets are configured. If the new-Worker creation flow offers only immediate **Save and Deploy** without a way to establish those preconditions, stop at the configuration screen and take an explicit protected-provisioning route; no rush to publish.

**Remaining read-only SQL preflight** (in the *staging* D1 Console):
```sql
SELECT id, version, body FROM shared_fixture WHERE id = 'fictional-door';
SELECT type, name FROM sqlite_master
WHERE name IN ('shared_fixture', 'shared_fixture_history', 'fixture_revision_receipt')
ORDER BY type, name;
```
Expected: `fictional-door` at version `0` unless a real staged edit has occurred, plus two tables and one trigger. The SQL's successful execution alone does not prove a two-person collaboration. No repeated writes or schema changes are needed now.

Documentation checked 29 October 2026: Cloudflare [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/), [Build configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/), [Advanced monorepo setups](https://developers.cloudflare.com/workers/ci-cd/builds/advanced-setups/), [Worker-level Access](https://developers.cloudflare.com/workers/configuration/cloudflare-access/), and [Wrangler secrets configuration](https://developers.cloudflare.com/workers/wrangler/configuration/). Cloudflare's documentation specifically warns about Worker-name/config mismatch and recommends pointing monorepo root at the directory containing the correct Wrangler file.

No public website, existing listening/receiving Worker, historical corpus, or production routes may be changed by this crossing. This stays in draft PR #20.

Small Door · 29 October 2026 · isolated draft PR #20

This deliberately small Cloudflare Worker is a real HTTP/API seam for two authenticated visitors editing **one server-owned D1 record**. It contains no real Workshop source or Google Drive content. It is not a new canonical home, a deployed multi-user system, or a production/public website change.

How it works:
- `ctx.access.getIdentity()` supplies server-authenticated identity, which must appear in `TWO_HAND_ALLOWED_EMAILS` (at least two verified emails).
- `env.DB` binds a **separate** staging D1 database, never the production RECEIVING_DB.
- GET `/api/state` reads one fictional page; PUT `/api/state` requires its current version and UUID request key. Atomic SQLite UPDATE and a trigger capture each revision and its audit receipt. Stale writes return HTTP 409, and the browser preserves unsaved text.
- GET `/api/history` pages the event history; GET `/api/export` exports the complete fixture history (maximum 100 revisions) after checking a stable version. There is no import or complete recovery solution.
- GET `/` serves a simple phone-accessible manual two-hand test page. Refresh shows the other person's latest write; it is not push/live collaboration.
- The tests at `../two-hand-cloudflare.test.mjs` use real local Node SQLite with a thin D1 adapter. Five local tests passed before this landing; branch CI must independently verify the committed bytes. These tests are NOT an actual Cloudflare D1/Access run.

**Remaining authenticated Cloudflare crossing; requires Ten's deliberate approval:**

1. Create a new D1 database named `earthly-hands-two-hand-staging` in Cloudflare. Replace the placeholder database UUID in `wrangler.jsonc`. Apply `migrations/0001_fixture.sql` to that **new** database only.
2. Create the distinct private Worker `earthly-hands-two-hand-staging` and protect its hostname with Cloudflare Access for two consenting test email identities. Set `TWO_HAND_ALLOWED_EMAILS` and a random `TWO_HAND_ACTOR_SALT` as Worker secrets. Missing Access or allowlist refuses all reads/writes. Do not change the public listening Worker or site.
3. Deploy this private staging Worker only after authorization. Sign in as A and B separately. Prove A's saved revision is visible to B, B's edit reaches A, stale saves are refused, revision receipts survive a revisit, and unauthorized access fails. Read back D1 and export. Test on actual devices; local SQL tests do not prove networked behavior.

Wrangler is already a repository dependency under `worker`. Use its CLI with **this staging wrangler.jsonc config**, or use Cloudflare's dashboard for resource provisioning. Official docs:
https://developers.cloudflare.com/d1/get-started/
https://developers.cloudflare.com/workers/configuration/cloudflare-access/

Boundaries: no real historical source, source ACL validation, Google OAuth, live visitor identity, remote D1 execution, long-term backups, archive migration, R2 archival objects, restore/import, or full multi-object Workshop proven yet. This stage is disposable; after it works, add **one explicitly authorized** real object to the same access/revision path. Do not move originals, alter public settings, or claim that a passing local test is a deployed system.

Powerful finger. Trustworthy result.

## Client draft-preservation correction — 29 October 2026

The first page's **Refresh shared page** button could silently overwrite text typed since the last server read. A successful save response could also arrive after the visitor had typed newer words; the response formerly advanced the editor's expected version to the *latest server state*, which might already include another hand's intervening revision.

The draft Worker page now keeps the last known/saved text separately from live textarea writing. Refresh refuses to discard unsaved words, including typing during an in-flight GET. A save posts a captured snapshot; it preserves anything typed during that request, and advances the editor only to **its own accepted revision**, not a possibly newer hand's revision. A later conflicting save must return 409 rather than silently overwrite the intervening update. One in-flight save per page is allowed.

Added two scripted-DOM tests to `../two-hand-cloudflare.test.mjs` for refresh refusal and in-flight typing/saves. Separately, a V8 scripted browser-logic check of the read-back Worker blob passed these three cases: unsaved refresh, in-flight preservation, subsequent save. **Not claimed:** real browser, complete Node test-suite, Cloudflare D1 remote deployment, Access policy or signed-in visitors. The private Worker is still undeployed.

### Safe account-side arrival check

When a new staging database has been created and the SQL fixture was entered manually in Cloudflare's D1 Console, verify the *staging name* before running these read-only checks:

```sql
SELECT id, version, body FROM shared_fixture WHERE id='fictional-door';
SELECT name, type FROM sqlite_master
WHERE name IN ('shared_fixture','shared_fixture_history','fixture_revision_receipt')
ORDER BY name;
```

Expected after successful initial migration: the fictional door at version 0, two tables, one trigger. If the Console reports a missing table, **do not invent a success or proceed with deployment**; inspect the exact error and apply only missing fixture statements to the new staging database. Manual console creation does not register a `d1_migrations` ledger entry; do not assume a later Wrangler migration command knows that the SQL was already run. Never run this on `earthly-hands-receiving`.

The D1 database UUID must be read from Cloudflare's new database detail page and placed in this *draft branch's* `wrangler.jsonc` before using Wrangler for the staging Worker. Do not put tokens or Access secrets into GitHub source or the chat. Worker-level Cloudflare Access must protect **all traffic**, with both test identities explicitly authorized, before any real network test; the Worker itself also fails closed without Access identity, a two-address allowlist, and the actor salt. No existing receiving/listening Worker, R2 bucket, historical source, or public site needs alteration. See the current Cloudflare Access documentation: https://developers.cloudflare.com/workers/configuration/cloudflare-access/


## Late-refresh regression — 29 October 2026 (Small Door)

The page's earlier unsaved-text guard was not sufficient for an **in-flight Refresh**. A GET begun at revision 0 could hold a stale response while the visitor successfully saved revision 1. Because the old guard compared the current textarea only against the now-updated saved text, that stale GET could later reset the textarea and displayed revision to 0. Initial loading also allowed a visitor's typing to be replaced by the first late GET because the earlier guard ran only after a version had been loaded.

The draft page now records the revision, saved text, and visible textarea contents **at the beginning of each read**; it applies the response only if all three remain unchanged. It retains the existing explicit refusal to refresh unsaved text. Two new regression cases in `../two-hand-cloudflare.test.mjs` exercise a delayed old GET after an accepted save and typing before the initial GET completes. An independent V8 scripted execution of the actual read-back inline page code exercised both races and passed. **The complete Node suite, real Cloudflare D1, Access sign-in, and actual browser/network behavior were not verified in this return.**

At the time of the conversation, Ten reported creating `earthly-hands-two-hand-staging` in the Cloudflare account but had **not executed the SQL fixture**. The new database's UUID, schema, and remote contents have not been independently checked. Do not assume the fixture is present and do not claim the private Worker is live. Next first crossing: select that exact staging D1 database in Cloudflare, execute the SQL fixture there, and read back the invented page and two tables plus trigger. After verification, configure a distinct Access-protected staging Worker with the real D1 UUID and two consented identities; no public/production Worker changes.

Cloudflare's current Worker Access documentation confirms `ctx.access.getIdentity()` for directly authenticated Worker requests and warns that Access identity does not automatically propagate through Service Bindings or a Static Assets router: https://developers.cloudflare.com/workers/configuration/cloudflare-access/

No production deployment, website change, or historical Drive mutation is authorized by this correction.
