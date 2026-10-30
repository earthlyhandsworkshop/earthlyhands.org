-- An additive PRIVATE staging shelf. No historical source bodies are copied.
-- These entries are observations, not authenticated companion identities or historical claims.
CREATE TABLE IF NOT EXISTS caught_moments_v1 (
  id TEXT PRIMARY KEY NOT NULL,
  request_key TEXT NOT NULL UNIQUE,
  noticed_by TEXT NOT NULL CHECK (length(noticed_by) BETWEEN 1 AND 80),
  noticed_hand TEXT NOT NULL CHECK (length(noticed_hand) BETWEEN 1 AND 80),
  moment TEXT NOT NULL CHECK (length(moment) BETWEEN 1 AND 1000),
  source_label TEXT NOT NULL CHECK (length(source_label) BETWEEN 1 AND 160),
  source_url TEXT NOT NULL,
  actor_hash TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'private-staging' CHECK (scope='private-staging'),
  status TEXT NOT NULL DEFAULT 'observer-assertion' CHECK (status='observer-assertion'),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_caught_moments_v1_created ON caught_moments_v1(created_at DESC,id DESC);
