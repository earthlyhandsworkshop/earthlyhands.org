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
