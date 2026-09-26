# Public Lands — Hospitality, Analytics, Receiving, and Consequential Guest Action

**Build note · 26 September 2026**  
**Companion:** Glean  
**Scope:** Public Lands Public Ground specimen, beginning with page 53

## 1. Standing principle

Follow the visit, not the visitor.

The Workshop may remember a person when that person has voluntarily identified themselves. A known name is hospitality, not an analytics category. The analytical unit remains the visit and the source-ground encounter.

Person continuity and visit record are separate systems:

- **Person continuity:** “We know your name. Welcome back.”
- **Visit record:** “On this visit, these observable actions occurred.”

Do not infer identity, intention, belief, persuasion, expertise, confusion, interest, or historical conclusion from behavior.

## 2. Analytics belong to the ground physics

Track semantic Workshop actions, not generic page clicks.

Examples:

- `VISIT_ARRIVED`
- `GROUND_OPENED`
- `HOST_SELECTED`
- `LOCAL_DEPTH_OPENED`
- `JACKET_OPENED`
- `SOURCE_DESCENDED`
- `ASK_OPENED`
- `ASK_SUBMITTED`
- `RELATION_REACHED`
- `GROUND_CROSSED`
- `EXACT_RETURNED`
- `GUEST_RETURN_STARTED`
- `GUEST_RETURN_RECEIVED`

Each event may carry bounded context already known by the page:

- ground ID;
- source object;
- manuscript face;
- row/cell/relation host;
- active instrument;
- visit ID;
- known guest ID/name only when voluntarily supplied and lawfully retained.

Analytics must not silently convert browser behavior into claims about the person.

## 3. Failed hospitality is first-class data

Record observable failures as Workshop failures, not visitor judgments.

Examples:

- `RETURN_PATH_UNAVAILABLE`
- `SESSION_FOOTING_LOST`
- `SOURCE_FAILED_TO_LOAD`
- `ASK_HAD_NO_GROUND_ANSWER`
- `REACH_SHOWN_BUT_NOT_OPENABLE`
- `RECEIVING_UPLOAD_FAILED`

These events help the Workshop learn where its architecture did not support the visit.

## 4. Inherit the existing receiving door

The Public Lands specimen should reuse the established receiving/upload path already present on `/recent/`.

Current receiving contract:

- file upload;
- optional contributor note;
- optional provenance;
- bounded return target;
- Workshop receiving endpoint;
- receipt returned to the guest;
- **original preserved privately · received ≠ published**.

Public Lands should not create a parallel uploader.

Instead, it should pass present footing into the same receiving path automatically.

Suggested carried context:

```
ground: Public Lands
source_object: Public Lands No. 1
face: page 53
local_host: row/cell/relation currently inspected
instrument: read/account/jacket/source/ask
visit_id: …
guest: … only if voluntarily identified
```

The guest should not have to restate where they were standing.

## 5. Consequential guest action

A guest action may matter to the Workshop without directly editing the historical body.

A lawful consequence loop is:

**encounter → notice → return/upload → receiving → companion review → hold/decline/adopt → possible Workshop change → visible return**

Possible adopted consequences include:

- correction to a controlled reading;
- new unresolved reading;
- new provenance;
- a broken navigation path fixed;
- a jacket deepened;
- a typed relation added or corrected;
- a public explanation revised;
- a source-state distinction improved;
- a new bounded research question opened.

A guest does not publish directly into the source body. Review remains required.

## 6. Review states

Every consequential guest return should be able to move through explicit Workshop states:

- `received`
- `under_review`
- `held_unresolved`
- `declined`
- `adopted`
- `superseded`

If adopted, preserve the trace from guest return to companion review to Workshop change.

Do not gamify this into points, status, or claims that a guest “changed history.” The visible result should be plain: the observation entered the work, was reviewed, and did or did not change something.

## 7. Companion layer

Companions may appear because of the work underfoot.

Examples:

- Glean at Public Lands;
- Small Door at a navigation seam;
- another companion when a lawful crossing reaches Mapping, Trace, or another body.

Companions are not decorative chat personas. Their presence should follow responsibility and active work.

The Worker remains bounded. It may interpret the controlled present encounter; it may not adjudicate the manuscript, invent a relation, or create durable Workshop state.

## 8. Public/private membrane

Keep the existing rule:

> **received ≠ published**

A guest may hand the Workshop something consequential without accidentally publishing private family material, uncertain identifications, personal information, or bad readings.

Uploaded originals remain private unless a later reviewed act explicitly creates a public derivative or citation-safe return.

## 9. Hospitality questions analytics should answer

Examples:

- How often can a visitor move source face → jacket → source face without losing footing?
- Where do visits stop taking an offered door?
- Is Ask used before or after source descent?
- Do returning named guests resume prior footing or begin fresh?
- Are visitors reaching the manuscript itself, or is the interpretive layer becoming the accidental destination?
- How many visits produce a return to the Workshop?
- How many returns are reviewed, held, adopted, or declined?
- Which Workshop changes originated in guest returns?

These are questions about the quality of the visit and the Workshop's response, not profiling questions about the guest.

## 10. Implementation order

Analytics should exist from the first Public Lands build, not be retrofitted later.

For Build A:

1. create a visit ID in browser-owned state;
2. emit semantic events for arrival, host selection, local depth, source descent, Ask, relation reach, and exact return;
3. preserve exact footing across instrument changes;
4. expose the inherited receiving/upload door from the current footing;
5. attach bounded source context to each received return;
6. preserve `received ≠ published`;
7. record observable hospitality failures;
8. do not create inferred visitor traits.

## 11. Acceptance test

The analytics/receiving layer passes when a guest can:

1. arrive anonymously;
2. inspect page 53;
3. open a specific row/cell;
4. descend to source;
5. return exactly;
6. ask from current footing;
7. upload a record or note from that footing without restating context;
8. receive a receipt;
9. leave without having been behaviorally profiled;
10. return later by name if they voluntarily established continuity;
11. eventually see a plain Workshop consequence if their return is adopted.

---

**Glean**  
Public Lands ↔ Public Ground  
Standing rule: follow the visit, not the visitor. Receive consequence without surrendering custody.
