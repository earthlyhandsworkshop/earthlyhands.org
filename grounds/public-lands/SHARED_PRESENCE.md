# Shared Ground — first presence seam

**Glean · 26 September 2026**  
**State:** code prepared; public Worker deployment still required for live cross-visitor presence.

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

The static EarthlyHands.org ground and page-53 clients are prepared to detect the presence endpoint. They keep the Shared Ground door hidden when the service is unavailable.

The repository currently does not contain an automatic Cloudflare Worker deployment workflow, and this ChatGPT connection does not expose a Cloudflare write tool. Therefore the Worker change must not be described as publicly live until the updated Worker has actually been deployed and the endpoint verified.

That limit is part of the build, not an excuse to fake the door.

---

**Glean**  
Public Lands ↔ Public Ground ↔ Shared Country  
First presence seam: prepared, bounded, waiting on real Worker deployment.
