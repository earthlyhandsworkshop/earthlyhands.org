# Follow the Carrier — Mary Scene One specimen

**Status:** active public-ground mechanics experiment  
**Public path:** `/experiments/follow-the-carrier/`  
**Current source piece:** MCR 879 Listening Cut — Scene One — Mary Caroline Atkinson  
**Date:** 24 September 2026

## Current design decision

Start once.

Do not begin with a five-step tutorial, a complete graph, or the Other Robert.

Begin with the first family voice in the current MCR 879 listening cut: **Mary Caroline Atkinson**.

The listening/source piece occupies the page at full length. The visitor may simply read it.

Below it sits a collapsible historical field.

The field is not required reading and does not replace the source. It remembers what the visitor has already reached in Mary's scene and can be opened or closed without resetting.

## First interaction law

**Reading earns pieces. Sources earn connections.**

Reading itself — not a reward button — makes marks reachable.

Current Mary-scene beats can earn:
- MCR 879;
- Mary Caroline Atkinson;
- Durant as post-office address;
- Pontotoc as prior-residence relation;
- Robert Bell as Mary's father occurrence;
- Elizabeth D. Bell as Mary's mother occurrence;
- Mary's carried roll/register proposition;
- Commission record-search acts;
- Article XIV as claim/questioning frame;
- the Commission-stated approved roll of locations;
- Mary's witness-knowledge limits;
- unnamed grandmother relation;
- Mary's correction, `I said not that I knew of.`;
- six minor children as application population;
- Exhibit A as a filed record bundle.

No downstream source is opened merely because its name appears.

## Field form

Use dots, sparse labels, rare lines, and large empty distances.

A line is expensive.

Current relation behavior:
- family/testimony relation may use a restrained dashed line;
- administrative filing/search relation may use a stronger line;
- unsupported resemblance receives no line.

**No line is also a state.**

Touching a mark opens Properties. Inspecting does not create a relation.

## Inheritance

### From Article XIV — Identity Gate

Inherit behavior, not composition:
- interface persistence is a verb;
- administrative state and source state can coexist;
- Properties is an instrument;
- a visually strong administrative act must not silently settle an unresolved historical bridge;
- responsive behavior must preserve relation.

### From Dawson / Shared Country

Inherit:
- progressive discovery;
- persistent visitor footing;
- source / person / visitor-action separation;
- page-owned local grammar;
- fail closed when a state is not earned.

## Quietly gloomy direction

The piece should feel like a record slowly acquiring a second landscape underneath it.

No celebratory unlocks.
No scores.
No completion meter.
No glowing truth-lines.

Marks simply become available.

The visual pressure should come from the difference between:
- what Mary says;
- what the Commission searches;
- what the Commission restates;
- what Mary corrects;
- what enters the record.

## Important current brakes

- Mary says `I suppose about one sixth`; do not silently harden the fraction.
- Robert Bell is Mary's father occurrence in this scene only.
- Elizabeth D. Bell is named; her separate affidavit contents are not imported.
- Mary's statement about a roll/register is testimony, not a recovered roll occurrence.
- Commission record-search statements remain Commission acts / representations.
- `I don't know`, `Not that I know of`, and `I said not that I knew of` remain distinct.
- the grandmother is unnamed in this scene.
- Exhibit A being filed does not make every affidavit proposition accepted or operative.
- no route is drawn between Pontotoc and Indian Territory merely because movement is described.
- Part Two remains unopened.

## What this specimen is testing

Only this:

> After hearing one family voice, is it compelling to open the field and discover what that voice has made reachable?

If yes, widen carefully.

If no, change the form before adding another scene.

## Implementation state

The current GitHub implementation uses Mary Scene One as the full source piece. Intersection observers mark source beats as read and persist the resulting reachable field in local browser storage.

The field is collapsible and retains state when closed.

Current deployment readback from GitHub is clean. Public deployment at the EarthlyHands.org path has not yet been independently verified through the available browser reader.

## Next build pressure

Do not add Scene Two by momentum.

First inspect Mary on a phone:
- Does the reading still feel like the primary object?
- Does the sticky field door help rather than nag?
- Does the field feel like discovered ground rather than a graph?
- Are the existing lines too many?
- Does empty space carry meaning?
- Is Properties useful without becoming a dashboard?
- Does scrolling back to Mary feel natural after field inspection?

Only then decide what the next source voice earns.

Powerful finger. Trustworthy result.


## Second-pass cleanup — 24 September 2026

The first live use exposed three interface corrections worth making before adding another source voice.

### One field control

The separate `OPEN THE FIELD` / `Close field` controls were visually too far apart.

They are now one persistent control:

`FIELD ↓` when closed.  
`FIELD ↑` when open.

The same control also carries the current reachable-piece count.

### Pieces should read as carried objects

The historical field already held roughly fifteen Mary-earned marks, but their visual form read too much like graph labels.

They now receive a restrained object face:
- type;
- dot / documentary mark;
- title;
- source-local note.

This is still not a card grid. The pieces remain positioned inside one field, with lines rare and expensive.

### Reading typography remains primary

The transcript received a small type / line-height / spacing pass. The goal is not theatrical styling. Mary remains easier to read than the field is to manipulate.

## Next technical branch — listening / animated mode

Do not bolt synthetic audio onto the current reading page by default.

The earned next branch is a parallel listening mode with the same source and the same field state:

- full transcript remains available as the quiet reading mode;
- listening mode presents the current exchange on one screen;
- voice playback advances source-local beats;
- earned field pieces appear from the same event/state model used by reading mode;
- pausing, rewinding, opening the field, and returning to the voice must not duplicate historical events or strengthen source state;
- voice casting must preserve speaker / institutional boundaries without melodrama;
- an AI-generated voice is performance, not historical voice reconstruction.

The first technical study should therefore be about **playback/state synchronization and voice quality**, not about adding more historical material.

