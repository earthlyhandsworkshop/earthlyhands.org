# Nightwolf — a separate-process continuity witness

Small Door · 28 October 2026 · isolated One Workshop draft PR #20 · invented data only

## The new crossing

The [local two-file tip](./nightwolf-mirror-tip.md) can recognize a replaced mirror database **only if its tip file survives**. Replacing the database *and* its tip with matching older copies defeated it. That was a known, executable counterexample, not an invitation to call the two-file carrier rollback-proof.

This opt-in specimen adds a **third, separately held SQLite witness** in another directory, consulted through a new, short-lived Node process. It holds a mirror ID, generation, SHA-256 mirror digest, predecessor digest, and chained witness receipt. It receives **no private event bodies or archival binary bytes**.

The [witness store](./nightwolf-witness.mjs) provides explicit `enroll`, `advance`, `check`, and `latest` operations. Enrollment is never implicit and accepts only generation 1 for a previously unregistered mirror. An advance must name the exact next generation and the previously witnessed digest; it commits under SQLite `BEGIN IMMEDIATE`. Reading replays the entire stored witness chain and refuses malformed chronology.

The [one-request-per-process CLI](./nightwolf-witness-cli.mjs) carries only small summary requests, not the mirror database path, private event bodies, or tip. This is a process boundary, **not** an OS security boundary or a network service.

The [witnessed mirror wrapper](./nightwolf-witness-gate.mjs) calls the separate witness process **before** an ordinary fixture read or write. On a write it commits the local mirror and tip, then advances the witness. A missing or contradictory witness refuses the guarded read and write. A failure *after* the local commit is reported and leaves future guarded reads closed rather than silently blessing the new state.

The original [Nightwolf mirror](./nightwolf-mirror.mjs), [SQLite carrier](./nightwolf-mirror-disk.mjs), [local tip](./nightwolf-mirror-tip.mjs), Old-Growth Workbench, and public website remain unchanged. This is an additional optional path, not a production replacement.

## Tested crossing

The [eight witness tests](./nightwolf-witness.test.mjs) and [six guarded-read tests](./nightwolf-witness-gate.test.mjs) use only fictional actors, notes, and binary bytes. They demonstrate:

- A separate Node process receives only a generation and digest and independently reopens its witness database.
- With the witness at generation 2, replacing **both** the mirror SQLite file and its tip with valid generation-1 copies is detected by a witness check.
- A different same-generation fork, skipped generation, wrong predecessor, repeated enrollment, malformed request, and tampered receipt chain are refused.
- Two SQLite witness handles cannot both accept the same next generation.
- Ordinary guarded reads and a guarded generation-2 write consult the witness process, including after close/reopen.
- A missing witness is **not** silently re-created.
- A raw-mirror-compatible multi-event batch that would skip a witness generation is refused **before** local SQLite commit, leaving the valid previous generation readable and a normal one-step append possible.
- An unwitnessed advance is detected. A simulated witness-write refusal *after* local commit leaves a visible mismatch and no automatic repair.
- A deliberately passing **counterexample**: replacing the witness file itself with an older internally consistent copy makes the witness accept that old state. The witness is not protected from a party who controls its file.

Source and test files were staged as Git blobs and checked against their exact blob hashes. **Independent CI witness for the preceding implementation (before the generation-skip preflight):** [GitHub Actions run 40638765657](https://github.com/earthlyhandsworkshop/earthlyhands.org/actions/runs/40638765657) at exact implementation-and-test commit `c0ac29a873d2bf4777f08b7c12e10cd2a336814e` recorded **274/274 Node tests passing**, zero failures. The Node job log explicitly includes the original separate-process and guarded-read cases. This added preflight regression requires its own exact-commit CI evidence. This verifies the isolated fictional suite, not a real Nightwolf device or authenticated network service.

## Boundaries still unearned

**Separate process is not separate trust domain.** The CLI and witness SQLite file run on the same test machine with no independently authenticated client, protected machine account, remote witness, signature key, or independently retained high-water mark. A person who can replace all three local files can still cause an undetected rollback. The stored hash chain detects contradictions **within its own history**; it does not authenticate that history or make it append-only against a fully privileged editor.

The `NightwolfWitnessedMirror` class is a **fixture-only optional wrapper**. Code that bypasses it can still open the underlying SQLite directly. Its `readForClaimedActor(actorId)` takes a claimed identity, not verified credentials or actual source permissions. Its process invocation is not an access-control boundary. A malicious caller can also submit forged but well-formed summaries to the unauthenticated witness. Nothing here establishes historical truth, custody, rights, publication authority, or a real companion login.

**Mirror/tip and witness commits are not one transaction.** A crash or witness refusal between them leaves a mismatch; the guarded API intentionally refuses further use. There is no reviewed recovery protocol, automatic synchronization, remote authentication, physical two-machine test, power-loss durability certification, archival object transfer, or live Nightwolf installation.

The next earned crossing would require an independently controlled witness service or device, authenticated callers, an explicit recovery procedure for interrupted two-phase advances, and source-rights verification. None of that has been implemented here.

No public deployment, merge, schedule change, or historical Google Drive migration was made.

Powerful finger. Trustworthy result. — Small Door
