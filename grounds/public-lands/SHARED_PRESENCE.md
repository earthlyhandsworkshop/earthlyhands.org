# Shared Ground — first presence seam

**Glean · 26 September 2026**  
**Verified live · 28 September 2026**  
**State:** public presence read seam live; the opt-in write / expiry contract is deployed but a two-visitor encounter was not exercised in this verification.

## Standing rule

**Shared ground, separate pockets.**

Shared presence means two or more visitors may knowingly occupy the same documentary ground without sharing one identity, one viewpoint, one private Ask history, one upload history, one learned state, or one historical claim.

## First implementation boundary

The first presence seam is intentionally small:

- opt-in only;
- ephemeral presence, expiring after roughly 90 seconds without a heartbeat;
- anonymous by default;
- a visitor may voluntarily expose a name;
- only current ground / footing and an explicitly shared name may be returned to other visitors;
- visit analytics remain a separate system;
- presence IDs are not exposed to other visitors;
- Ask history is never exposed through presence;
- receiving/upload history is never exposed through presence;
- no inference of identity, interest, expertise, relationship, or intention;
- leaving shared presence does not remove the visitor from the documentary ground.

## Public Lands first test

Two presence hosts are prepared:

1. **Public Lands ground entrance** — visitors may know that others are presently in Public Lands at the working table.
2. **Public Lands No. 1 · page 53** — visitors may know that others are over the same documentary face and, when those visitors choose presence, see their current public footing such as historical face, row 26, brace relation, Account, or Jacket.

This is deliberately not a chat room.

The first useful question is simply:

> Can two people feel that they are meeting over the same source while retaining separate footing and private pockets?

## Service contract

The bounded Worker defines `/presence` against the existing D1 binding.

- `POST /presence` — opt into / refresh one ephemeral presence.
- `GET /presence?ground=…&self=…` — return other active presences on that ground.
- `DELETE /presence` — leave shared presence.
- stale records are removed from the active view after roughly 90 seconds.

Returned public fields are limited to:

```
{
  footing,
  name // only when the visitor explicitly chose to share it
}
```

The browser owns the visitor's presence choice. The Worker stores only the bounded ephemeral state needed for cross-browser visibility.

## Identity discipline

A visitor name is a voluntary social label, not a historical identity object.

A historical name occurrence such as **Allen Yates · row 26** is a different kind of body.

A companion such as **Glean** is a third kind of presence.

These may eventually be encounterable on the same ground, but they may not be silently merged.

- visitor != historical person occurrence;
- companion != visitor;
- same-name historical occurrence != same historical person;
- shared attention != shared conclusion.

## Name Web horizon

Name Web should make source-earned person occurrences discoverable before identity is resolved.

The Public Lands test therefore points toward a future grammar in which:

- a page contains a person occurrence;
- an occurrence may expose other controlled occurrences;
- identity relation may remain open;
- two visitors may meet over one occurrence;
- either visitor may carry a question or return without changing the occurrence's historical standing.

## Deployment boundary

The static EarthlyHands.org ground and page-53 clients detect the presence endpoint. They keep the Shared Ground door hidden when the service is unavailable.

On 28 September 2026, a fresh load of the deployed Public Lands ground made the **Shared ground** door visible. In the governing client, that door is revealed only after `GET /presence` returns an OK response and valid JSON. The page reported no presence-fetch or CORS error. This establishes the public read seam from the deployed ground to the Worker.

This verification deliberately sent no `POST` or `DELETE`: it created no visitor presence, exposed no voluntary name, and did not test a second browser, heartbeat refresh, cross-visitor visibility, or stale-record expiry. Those remain the next live test.

The repository contains no GitHub Actions Worker-deployment workflow. That absence does not establish a manual-only deployment boundary: after the footing-custody commit reached `main`, the public Worker returned the new commit-specific `presence_ground_not_held` refusal without a Wrangler session in this runtime. The observed behavior establishes that an external Cloudflare integration, or an equivalent deployment path outside the repository workflow files, carried the Worker change live. The exact external mechanism remains outside this repository's present evidence.

The earlier “waiting on real Worker deployment” statement is superseded by this verification. The narrower unverified boundary is now the first actual two-visitor encounter.

---

**Glean**  
Public Lands ↔ Public Ground ↔ Shared Country  
First presence seam: public read path live; two-visitor encounter still to be witnessed.

## Name-custody tightening — 28 September 2026

The Public Lands ground and page-53 clients now send an empty `display_name` unless the visitor explicitly checks the name-sharing control. A locally filled continuity name therefore stays on the visitor side when presence is anonymous.

The Worker source independently enforces the same boundary by discarding `display_name` whenever `share_name` is false. This is deliberate defense in depth: the browser should not transmit an unshared name, and the service should not retain one if a direct caller submits it anyway.

The two static client guards were pushed, publicly landed, and read back from the deployed ground and page-53 surface. The Worker guard is also live: the later footing-custody validation was observed on the public Worker from the same current source line, establishing that the intervening name guard crossed the deployment boundary as well.

No Ask history, visit analytics, upload history, historical identity state, or person-occurrence relation was joined to presence by this change.

## Footing-custody tightening — 28 September 2026

The presence service now accepts only the two public hosts that presently exist: the Public Lands entrance and the controlled page-53 table. It also validates every published footing against the deterministic states those clients can actually produce. Page-53 row points are limited to rows 1–34; view points are limited to LOOK / READ / ACCOUNT / JACKET / ASK states; relation points are limited to the route IDs in the controlled page-53 body.

An allowed-origin caller therefore cannot make an invented ground, row, relation, or arbitrary label appear in another visitor's Shared Ground view. Older or malformed stored footing is omitted from the public return rather than strengthened into scenery.

This Worker correction is live. A read-only request for an invented ground returned HTTP 400 with `presence_ground_not_held`, while a read of the real Public Lands ground continued to answer normally. The refusal created no presence record and exposed no visitor name.

— Glean
