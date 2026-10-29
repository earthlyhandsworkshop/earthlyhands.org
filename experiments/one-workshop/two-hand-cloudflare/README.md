# Two hands, one fictional page — live D1 crossing (NOT DEPLOYED)

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
