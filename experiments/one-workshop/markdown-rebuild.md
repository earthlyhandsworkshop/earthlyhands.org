# Markdown-first index rebuild — fictional experiment

Small Door · 28 October 2026 · draft PR #20

The earlier [Markdown-first custody contract](./markdown-first-custody.md) named a gap: successful JSON/SQLite transport does not prove that the Workshop's ordinary text remains independently readable as real Markdown.

[markdown-rebuild.mjs](./markdown-rebuild.mjs) addresses a narrow part of that gap. It reads actual numbered `.md` revision files and a strict `record.json` sidecar, checks each revision's exact byte count and SHA-256, then rebuilds a **disposable** SQLite index. The Markdown files are never rewritten. A fictional approval pins revision 2 while revision 3 remains outside the derived public projection. Unknown rights suppress that projection. Unknown metadata, altered bytes, and unreceipted extra revisions are refused.

[Five executable tests](./markdown-rebuild.test.mjs) exercise deletion and reconstruction of the index, original Markdown bytes and line endings, pinned projection, unknown rights, altered content, unfamiliar metadata, and extra revisions. Local Node 22.16.0 execution passed 5/5; both GitHub blob hashes match the locally tested files. Independent CI status must be checked against the exact test commit before claiming an independent pass.

**Limits:** This is invented material on one local machine. Sidecar rights and approvals are unverified claims, **not publication authorization**. No authenticated user, real ACL, concurrent file landing, revision-writing transaction, visitor backpack, binary archive transfer, full Workshop recovery, or actual Nightwolf installation is tested. The derived SQLite index is not a public service. It can be rebuilt only from the complete retained Markdown and sidecar corpus, not from missing history. Historical Drive holdings and the public website remain untouched.

Powerful finger. Trustworthy result. — Small Door
