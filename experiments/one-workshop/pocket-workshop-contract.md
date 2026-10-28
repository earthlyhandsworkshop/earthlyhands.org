# Pocket Workshop — interface and shared-session contract (draft)
Small Door · 27 October 2026 · One Workshop PR #20, isolated experimental branch

## The walk that earns the interface

A person opens the Workshop on a phone. They may return directly to living work, or voluntarily pass through 01. A persistent, simple navigation reaches the Workshop, their folio box in the alcove, the Old-Growth Workbench, a cross-Workshop knowledge search, Bello, Line Commons, 02, 15, and other grounds. A companion should use the same underlying object operations, not a privileged alternate truth channel.

The first static specimen is `pocket-workshop.html`. It uses fictional examples only. It has no account, database, live score, remote call, source text, or actual invitation. It is not a deployment and not a working multi-user Workshop. Do not confuse the visible "Preview invitation" control with a delivered message.

## Folio alcove, not a compulsory backpack — 28 October 2026

Ten clarified a consequential interface distinction. His **folio box** belongs in the Workshop's **folio alcove**. He calls for it, works with it, closes it, and it returns to its place. The Workshop should not visually burden him with a backpack that follows him from room to room. The return is a change of working view, **not** a transfer or deletion of custody.

The earlier "backpack" experiments remain useful as technical tests of portable personal receipts, offline copies, and recoverable history. They do **not** establish a required visitor metaphor, a compulsory carried inventory, or thousands of permanent visible folio boxes. Portable data is a storage capability; the folio box is one possible, already-earned Workshop experience. A visitor might choose a folio, a simpler saved place, or no persistent personal container at all. The interface must not assume that everyone wants one.

**Interaction contract:** request an authorized folio box from the alcove → show only its permitted contents → work with chosen references and notes → close the view → return the box to its alcove position. The same stable identity and revision history survive closing, returning, device changes, and permitted export. Opening a box does not relocate archival originals; closing it does not erase private history. Permission, retention, recovery, and actual synchronization remain backend responsibilities.

**Acceptance questions for a later real UI:** Can Ten summon and dismiss his box without carrying a persistent backpack icon? Can he return and find his contents and earlier revisions? Does the box stay in the alcove when closed? Can a visitor decline a personal container entirely? Does a private box stay private even when another visitor opens the Workshop? These are requirements to test, **not claims of implemented behavior**.

## Shared object and shared session are distinct

An **object** has stable ID, type, current revision, source and provenance references, scope/permissions, history, and a route home. It may be a folio leaf, source jacket, question, finger, drawing, game record, or versioned standing. The canonical Markdown/source bodies are senior to any derived index. A **session** is a temporary gathering around one or more objects. It has session ID, participants and roles, a pinned or explicitly moving revision view, message/event history, invitations, and a recoverable return path. Ending the session must not move or erase source custody.

An **invitation** is an addressed request, not an assignment or instant summon. The recipient may accept, defer, decline, or remain silent. The UI may show "invited" only after a backend acknowledges durable delivery. It may show "present" only after a participant actually joins the session. Scheduled companions may not be able to join in real time; the interface must show asynchronous state truthfully rather than fabricating presence. No new hourly automation is implied.

## Human and companion capabilities

The same API verbs should be available to human and companion principals when their authorization allows: search, read, inspect source road, propose, comment, contribute a finger, open a folio, invite, join, challenge, and examine settlement. **Equal capabilities are not unrestricted access.** Deny by default; enforce permissions server-side on every object, search result, invitation payload, and session event. A visitor's private folio remains theirs. Ten's sharing choices do not grant all users access to other people's folios. No client-only access guard is sufficient.

## Standing is not the entirety of 15

Index all authorized objects as **recorded**. Separately maintain current **earned standing** with proposition, scope, source evidence, who examined it, counter-evidence, review decision, version, supersession link, and reopening conditions. A document's existence, an invitation, a Bello victory, or a model-generated summary is not an automatic settlement. Retrieval should surface relevant standing and the source trail; an answer-time check should catch contradictions without treating every archived assertion as authoritative.

## Mobile interaction and data shape

- Five persistent destinations: Workshop, Folio box, Old Growth, Find, Bello. Secondary destinations are reachable from the Workshop ground.
- Search returns a permission-filtered result with title, object type, standing state, source road, and last verified revision. If rights are unknown, do not show even the title to an unauthorized principal.
- Folio boxes rest in the alcove. Reach is not route; working views are not custody moves.
- Bello counters come from verifiable game events, never invented points or conflated with historical truth.
- Offline, stale, loading, conflict, pending invitation, declined invitation, and revoked access are distinct states.
- All critical controls must be keyboard and screen-reader accessible and usable on a narrow phone.

## Backend contracts to test before connecting actual users

1. `GET /me`: authenticated principal and allowed capabilities, not an assumed companion identity.
2. `GET /search?q=...`: permission-filtered records with source and standing distinction.
3. `GET /objects/:id`: verified revision, source road, ACL, history; no public leakage.
4. `GET /folio/:owner`: current chosen references and notes, never a duplicate canonical archive.
5. `POST /sessions`: create session around stable object IDs, with server-validated permissions.
6. `POST /sessions/:id/invitations`: durable invitation, recipient authorization, delivery status, expiry; idempotent request key.
7. `POST /sessions/:id/join`: explicit acceptance, presence receipt, and permission check.
8. `GET /sessions/:id/events`: ordered, recoverable session history; avoid presenting absent participants as present.
9. `GET /standing?topic=...`: current versioned settlement with evidence and reopen road.
10. `POST /bench/proposals`: evidence-backed challenge, never silent overwrite of settled standing.
11. `GET /bello/positions/:id`: event-sourced game position and receipts, when game service actually exists.

All mutating operations need authenticated identities, idempotency, concurrency protection, audit receipts, and explicit authorization. Public pages are separately authorized views, never a side door into private Workshop material. Nightwolf can host services, but data, indexes, and sessions must be exportable and restorable on another machine.

## Next proof, not assumed success

Run the mobile UI on a real phone; verify navigation and accessibility. Connect **one** read-only authorized object through a real backend with a permission check. Then demonstrate an invitation to a consenting participant, its actual receipt, acceptance or deferral, and the same object visible to both without source movement. Finally test revocation, stale revisions, and restoration after a restart. Only after that should companion continuity or live Bello balances be represented as operational.

No website deployment, public data release, migration, or companion invitation is authorized by this draft.

Powerful finger. Trustworthy result.

## Separate local two-hand phone walk — 27 October 2026

The isolated browser/API specimen **Pocket Workshop — Two-Hand Phone Walk v0.2** was saved as a ZIP and read back byte-for-byte in Google Drive Workshop 15: [archive](https://drive.google.com/file/d/1I0OtnfLpepsPuHC7WF4vTb0PmzZJSTUK/view), [README](https://drive.google.com/file/d/168BXZLQe9Jd_cPZXzj8so0ZexeD2Gf15/view). This is a companion artifact to this branch's static interface, not code deployed by this repository.

Its local fictional service and browser UI demonstrate both invitation directions, explicit acceptance, a shared object, notes, and session recovery. 24 Node tests passed; a Chromium logic walk with a Python-to-loopback API bridge passed at a narrow phone viewport. Direct Chromium HTTP navigation was blocked in the test environment, so no native phone/HTTP browser claim is made. All tokens and principals are invented; no real identity, Drive source, companion delivery, or public deployment is connected. The secure authenticated read-only object crossing remains open.

## One real-source OAuth doorway — 27 October 2026

The separate **Old-Growth Workbench Authenticated Doorway v0.6** experiment now lives in Workshop 15: [archive](https://drive.google.com/file/d/1OMev2n8MmHWlVKI2EYUI85UwtY87lRrG/view), [instructions](https://drive.google.com/file/d/1AqHCrQmwwcCWoDlCZzyga-ckyGc95BNR/view). It implements a loopback-only Google OAuth authorization-code + PKCE path with verified userinfo, a local email allowlist, and a read-only one-source Drive gateway. Every source read is designed to use the actual user's Drive token and to refuse changed bytes, custody, or revoked provider access. Its 21 automated tests passed using a fake Google provider; the complete real source bytes passed the hash gate through that fake provider. No actual Google OAuth login, real phone authorization, or live provider API call from the gateway has yet occurred. It must not be publicly deployed, treated as production authentication, or used as a live companion service. The first real authorization still requires a properly configured Google OAuth client and explicit consent; do not paste credentials into Workshop bodies or GitHub.
