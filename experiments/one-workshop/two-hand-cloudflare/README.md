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
