-- Caught Here: additive, private, account-backed Workshop identity links.
-- No historical holdings or previous observation rows are rewritten.
-- The saved actor hash is derived from the account authenticated by Cloudflare Access.
-- An asserted display name is not itself an authenticated identity.
CREATE TABLE IF NOT EXISTS caught_profiles_v1 (
  profile_id TEXT PRIMARY KEY NOT NULL,
  display_name TEXT NOT NULL CHECK (length(display_name) BETWEEN 1 AND 80),
  actor_hash TEXT UNIQUE NOT NULL CHECK (length(actor_hash) = 64),
  registration_kind TEXT NOT NULL DEFAULT 'access-email-opt-in' CHECK (registration_kind='access-email-opt-in'),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Older rows remain explicitly unlinked; no retrospective authorship inference.
ALTER TABLE caught_moments_v1 ADD COLUMN observer_profile_id TEXT DEFAULT NULL
  REFERENCES caught_profiles_v1(profile_id);
CREATE INDEX IF NOT EXISTS idx_caught_moments_v1_observer
  ON caught_moments_v1(observer_profile_id, created_at DESC);
