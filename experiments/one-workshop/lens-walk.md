# Perception lens — one corpus, moving field of attention

Small Door · 28 October 2026 · draft PR #20, isolated fictional test

## The earned question

Ten described the earlier Name Web / Prose Map instruments as sometimes beautiful fixed views that only a companion could rewire. He wants something more like a microscope: **keep the underlying leaves, but change the center, zoom, and field of attention without reconstructing the evidence each time**.

The [Prose Map's Architecture + Build Grammar](https://docs.google.com/document/d/1G2Cw42FQdNPX1HqZ9kfb46m3U3_3pMSfLoilSlzEHOY/edit) already holds the governing distinction: exact source occurrence first; related places and people remain separately witnessed; a comparison corridor does not prove one identity; no line without prose lineage. The older Bell/McKinney RTF comparison jacket proves why this matters, but **no real family evidence, captured RTF, or visitor record is in this test**.

This narrow experiment asks whether the *same* approved fictional collection can return different read-only neighborhoods without turning source phrases into new historical claims or leaking hidden pathways.

## The executable piece

- [`lens-walk.mjs`](./lens-walk.mjs): a small, pure fixture validator and read-only `walkLens` operation. Its inputs are *claimed* occurrences, named anchors and directly evidenced or comparison-only relations.
- [`lens-walk.test.mjs`](./lens-walk.test.mjs): ten tests built from an invented Neri Vale example. Two source occurrences happen to have the same written name and neighboring cadastral addresses; they are **not joined as one person**.

A query chooses an occurrence or anchor to center on, radius `0..3`, and which facets (`spatial`, `documentary`, `comparison`) to include. The graph can be recentered and widened or narrowed without rewriting the data. Each returned source occurrence retains the original exact phrase, source ID/locator, separate event and record dates, identity state and nonclaims. Relations retain their original verb direction, separate witness, and direct-source versus workshop-comparison standing. The query does **not** infer a new relation from a multi-hop path.

Before traversal, declared access compartments filter **both** nodes and edges; a hidden intermediate cannot create a visible path, count, or identifier. A relation marked public cannot carry a private witness; unknown rights, future fields, dangling IDs, and attempted promotion of a comparison to source testimony refuse. An unavailable focus produces the same error whether the object is hidden or missing.

Run from repository root on Node 22+:

```sh
node --test experiments/one-workshop/lens-walk.test.mjs
```

Local fixture run: 10/10 passed before commit. This is a **read-only test, not an interactive map**, and it is intentionally limited to 1,000 nodes and 5,000 relations. It produces data from which a future view might be drawn, not a visual rendering or a change to Prose Map itself.

## What a pass must not imply

The `viewer` is just a **caller-supplied test value**: it is neither login nor real authorization. Likewise, the provenance strings and access states are claims supplied by fictional input; the module does not fetch source jackets, validate a particular real permission, authenticate witnesses, or verify identity. Validation of all submitted fixture records would need different error handling and isolation in a public service. There is no indexing/performance evidence at Workshop scale, no corrections over time, no real concurrent revisions, no cross-companion retrieval, no external browser and no physical-machine cold return here.

This is not yet a unified database, deployed web service, endorsed data model, or completed microscope. It belongs beside the other tests on the unmerged experiment branch. In particular, do not migrate Name Web, Prose Map, old RTFs, historical Drive holdings, or public pages into this invented fixture.

**Useful distinction:** a source-bearing occurrence can be re-viewed many ways without acquiring a new identity, geometry, permission or historical verb. The *view* changes. The original claim does not.

Powerful finger. Trustworthy result. — Small Door
