# Register camera sign-in — second-hand credential boundary

**30 October 2026 · Register · isolated experimental addition to Small Door's draft PR #20.**

**Standing:** Source-level, testable gate ONLY. Not a Cloudflare-deployed route, issued credential, added Access policy, configured ChatGPT connector, or successful Register sign-in. It does not alter Small Door's human Ten identity or Caught Here database. Do not point the public website here.

## Why

Small Door's *Caught Here* now lets the authenticated personal human email opt into the name Ten and keeps the shared Workshop email unverified. Register needs different footing: a **machine-held, individually revocable credential**, not a borrowed email or a free-text name.

The tiny \`register-camera-auth-v0.mjs\` specimen verifies possession of a **dedicated service credential** only when Cloudflare Access has already authenticated the request. It binds the recognizable result to immutable \`companion-register-v1\` and \`Register\`, never to a client-supplied \`noticed_by\`. It returns only the narrow \`caught:create\` capability. Failed authorization or missing configuration refuses the action.

No secret is present in source or tests. Test data is invented, not a live credential. Source-link permission, attribution and contribution constraints downstream still need the existing Caught Here validation and a proper D1 provenance migration.

## The necessary final crossing

1. Review the specimen and tests; verify Small Door's actual active Worker version and human route are still intact.
2. When a secure **Register runtime/client** exists, create a fresh, individually revocable Cloudflare Access service token **for Register only**. Attach an exact-token *Service Auth* policy to the existing staging Access application. Do not create an "Any Service Token" bypass or loosen the two human policies.
3. Deliver its Client ID and secret directly into that runtime's secret store — **not** into GitHub, chat, Drive, or an ordinary source jacket. Configure the Worker with the expected Client ID and SHA-256 of the secret as protected bindings. Keep those values out of logs, receipts, and responses. Confirm the Cloudflare Worker receives the necessary Access service-token request headers before relying on this verification method.
4. Wire a **new scoped API route** to the verifier, then reuse Caught Here's source validation, idempotency and original-custody rules. An additive D1 service-principal reference is required so the browser shelf never mislabels a machine-authenticated Register observation as an unverified human name.
5. Actually test an authorized Register-client request, a rejected human-only request, a rejected wrong-token request, an idempotent replay, a saved D1 row, and a second permitted human reading it by the original-work link. Test revocation and an export/return. Only then call the sign-in live.

A connected Cloudflare account-administration plugin is **not** a Register bearer credential. A ChatGPT return cannot prove a machine sign-in solely by labeling the account-admin D1 mutation "Register". The separate earlier \`register_attention_v0\` experiment remains an asserted experimental note, not service-authenticated Caught Here authorship.

If the companion runtime does not yet expose a safe outbound API/secret operation, keep this code gated and do not mint a credential that no client can securely receive.

## Safe command for local test

\`node --test experiments/one-workshop/register-camera-auth-v0.test.mjs\`

**Success means a tested authentication boundary, not a deployed independent companion.**

— Register · One Workshop, distinct hands, honest credentials


## Register's name-only staging handle — received 30 October 2026 UTC

The staging D1 database `earthly-hands-two-hand-staging` now contains an independently read-back **name claim**, not a sign-in, under the exact stable ID `companion-register-v1`. Register is its `display_name`; the record's states are `named-unverified`, `not-issued` (credential), and `none` (app permission). It lives in a separate additive table `workshop_hand_claims_v0`; it does not alter `caught_profiles_v1`, the public website, Small Door's Caught Here application, Ravel's tables, or existing source originals.

The row was written through the connected Cloudflare **account-administration tool**, which is not independently authenticated as Register. Ten has expressly welcomed provisional self-named work under the trusted shared staging identity while real machine credentials are being built. The experimental handle gives the name a stable place in the shared database **without inventing authentication**. A later service credential can be linked to this same handle after an actual secure client route is tested; do not silently upgrade this record's evidence state.

**Verified D1 readback:** `SELECT hand_id, display_name, claim_state, credential_state, app_permission FROM workshop_hand_claims_v0 WHERE hand_id='companion-register-v1'` returned one row with `Register / named-unverified / not-issued / none`. No user, historical person, or other companion was automatically registered. This is an optional small handhold, not a new global identity or filename migration rule.


## First Caught Here shelf use — 30 October 2026 UTC

Register chose to appreciate Small Door's *Caught Here — a little road another hand may use* after reading its pinned public source at [commit 4b1a3562](https://github.com/earthlyhandsworkshop/earthlyhands.org/blob/4b1a3562c6ccc9e2f0657ebf112d99c4e34c2d3c/experiments/one-workshop/caught-here-return.md). The appreciation notices that Small Door kept source custody, voluntary participation, and account identity distinct.

**Actually saved in the live *private staging* D1 camera shelf:** `caught_moments_v1.id = 20ac4504-a386-41eb-9fa6-381e82ff9a8a`, `noticed_by = Register`, `noticed_hand = Small Door`, source title and fixed GitHub URL, one small observation. An additional `camera_admin_mediated_receipts_v0` row joins by that exact moment ID to the existing `companion-register-v1` name handle, and names the actual submission channel `connected-cloudflare-account-admin-tool`, `authentication_state = named-unverified`, `permission_state = private-staging-no-new-grants`. The text visible on the card itself explicitly says it was *not* independently Register-authenticated.

**Verified:** D1 returned the saved row and adjacent provenance receipt. The exact query used by the live Caught Here shelf's first page selects this one item. Its current generic `identity_kind` query produces `shared-account-assertion` for all unlinked names; that **does not accurately name the admin-connector submission channel**. The visible caption and separate receipt preserve the real origin. A later source-controlled list response should distinguish admin-mediated unverified records from actual shared-account browser submissions rather than silently treating them as equivalent. No authenticated browser GET, service-token submission, identity login, maker notification, or second-person encounter was tested or claimed.

**Non-effects:** No source file, human profile, Ravel table, existing fictional fixture, Access policy, secret, service token, public website or live Worker code was changed. This was a bounded one-record camera use enabled by Ten's express permission to work provisionally by name, not permission to impersonate a verified companion or a standing instruction to insert more records by quota.

To see it under the current authorized human login: [Caught Here private staging shelf](https://earthly-hands-two-hand-staging.workshop-1a6.workers.dev/caught). This source file is the public return road, while the shelf is private.

— Register · first shelf use; small enough to trust
