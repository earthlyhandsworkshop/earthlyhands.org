# Landing Desk v1

One private aperture for ordinary Earthly Hands Workshop Markdown.

## Purpose

Companions should manipulate Workshop objects, not Google Drive transport mechanics.

The Landing Desk accepts a small semantic request and owns the provider work:

\`\`\`
THINK → LANDING DESK → DRIVE WRITE → READBACK → RECEIPT
\`\`\`

No temporary Google Doc is part of this path.

## Private routes

All routes require Cloudflare Access and an email explicitly listed in \`LANDING_ALLOWED_EMAILS\`.

### Health

\`GET /landing/health\`

Returns configuration state and configured destination aliases. It never returns credentials or folder IDs.

### Read Markdown

\`GET /landing/markdown?destination=15&file_id=<DRIVE_FILE_ID>\`

The file must be a Markdown-like raw file whose direct parent is the configured folder for that destination.

Receipt includes the current body and SHA-256.

### Create Markdown

\`POST /landing/markdown\`

\`\`\`json
{
  "operation": "create",
  "destination": "15",
  "name": "FINGER — example.md",
  "body": "# Example\n"
}
\`\`\`

The Desk refuses a same-name collision instead of silently creating a duplicate.

### Update Markdown

First read through the Landing Desk. Then send the returned SHA-256:

\`\`\`json
{
  "operation": "update",
  "destination": "15",
  "file_id": "<DRIVE_FILE_ID>",
  "expected_sha256": "<SHA_FROM_FRESH_READ>",
  "body": "# Revised body\n"
}
\`\`\`

If the Drive bytes changed since the read, the Desk returns \`409 landing_stale_write\`. It does not overwrite the newer body.

Every successful create/update is read back from Drive. A successful receipt contains \`verified: true\` and the SHA-256 of the bytes actually read back.

## One-time private configuration

The Worker uses Google OAuth on behalf of the Workshop Google account so files created in My Drive remain owned by that account. Google documents that service accounts do not have ordinary Drive storage quota and are principally suited to shared drives; user OAuth is therefore the intended v1 road for the current Workshop Drive.

Enable the Google Drive API for the OAuth project and obtain a refresh token authorized for the Drive scope. Store these only as Worker secrets:

\`\`\`sh
npx wrangler secret put LANDING_ALLOWED_EMAILS
npx wrangler secret put GOOGLE_OAUTH_CLIENT_ID
npx wrangler secret put GOOGLE_OAUTH_CLIENT_SECRET
npx wrangler secret put GOOGLE_OAUTH_REFRESH_TOKEN
npx wrangler secret put WORKSHOP_DRIVE_DESTINATIONS_JSON
\`\`\`

\`WORKSHOP_DRIVE_DESTINATIONS_JSON\` is a private alias map, for example:

\`\`\`json
{
  "15": "<folder id>",
  "01": "<folder id>",
  "04": "<folder id>"
}
\`\`\`

The client never supplies an arbitrary folder ID. It supplies an alias; the Worker resolves that alias privately.

## v1 brakes

- Markdown only.
- 1 MiB maximum body.
- Create refuses same-name collisions.
- Update requires a fresh content SHA.
- Update verifies the target is directly inside the declared destination.
- No delete, move, rename, or Google-Doc transport.
- No credential, folder ID, OAuth response, or upstream provider body is returned to the caller.
- Readback is mandatory before receipt.

## What this removes

A companion should no longer need to reason through:

\`\`\`
local file
→ runtime file reference
→ temporary Drive carrier
→ provider file reference
→ raw update
→ readback
→ carrier cleanup
\`\`\`

The provider-specific sequence is the Landing Desk's job.

**MARKDOWN IN. VERIFIED RECEIPT OUT.**

— Earthly Hands Workshop
