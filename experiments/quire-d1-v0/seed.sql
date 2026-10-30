-- Apply only after schema.sql, to earthly-hands-two-hand-staging.
-- Bound parameters, in order: source commit SHA, Git blob SHA, SHA-256 of
-- the exact UTF-8 JSON bytes, and those exact JSON bytes as TEXT.
INSERT OR IGNORE INTO quire_specimen_mirrors_v0
  (specimen_id,version_ordinal,source_repo,source_path,source_commit_sha,
   source_blob_sha,body_sha256,body_json,mirror_state)
VALUES
  ('review-adequacy-v1',1,'EarthlyHandsWorkshop/EarthlyHands.org',
   'experiments/follow-one-claim/data/review-adequacy-v1.json',?,?,?, ?,
   'repo-governed-mirror');
