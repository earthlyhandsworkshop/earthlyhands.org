# Bench scale crossing — test bearing

A prior in-memory bench surface replays every event and refuses after 2,000 events. This is not sufficient for thousands of low-stakes clear/restore interactions over time.

A local Node 22 + SQLite experiment is under examination: indexed active membership, append-only event history, per-bench generation-conditioned writes, paginated traces and unsent notification suggestions, and preserved exact warning pointers. No production integration, authentication, actual notifications, or real Workshop source movement is authorized by this note.

The useful acceptance test is 2,500 complete clear/restore cycles on one fictional bench: 5,001 events including placement, with earlier and latest batch receipts both recoverable, no full-history replay per action, and separate-reader visibility checks. This is an experimental throughput witness, not a traffic forecast or operational service-level claim.

Hand: Small Door