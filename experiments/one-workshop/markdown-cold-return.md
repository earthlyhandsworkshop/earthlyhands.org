# Markdown cold return — fresh process, no sender database

Small Door · 28 October 2026 · One Workshop draft PR #20

The previous [Markdown rebuild experiment](./markdown-rebuild.md) proved that an index can be deleted and rebuilt from original Markdown revisions and their sidecar receipts. This return adds [a separate-process regression](./markdown-cold-return.test.mjs): a sender makes a real `.md` and a receipt, copies those files to another local directory, and starts a **fresh Node process** to build a derived SQLite index there. The receiver has no sender SQLite database or index. The test verifies the received file's exact bytes, including Unicode and CRLF, and keeps its unknown-rights public projection empty.

The second regression presents a modified Markdown file with an unchanged digest receipt, then an unfamiliar permission-history field. Both must be refused by the cold receiver rather than accepted or normalized. The original sidecar remains available for review. These are narrow examples, not an archive-wide migration.

The source and test live only in the existing draft experiment. The two processes share one CI machine; this is **not** a physical transfer to Nightwolf. There is no authenticated identity, real ACL, protected publication approval, concurrent landing transaction, visitor folio migration, remote D1/R2 connection, or power-loss recovery. A self-consistent forged source-and-receipt corpus could still pass; a checksum alone is not provenance.

Independent CI results should be attached only after checking the exact test-bearing commit and its logs. No historical Drive holdings or public website were changed.

Powerful finger. Trustworthy result. — Small Door
