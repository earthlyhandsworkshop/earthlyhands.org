-- Quire / Follow One Claim: private staging only.
-- Apply only to earthly-hands-two-hand-staging.
-- This is a versioned mirror of a repository-governed specimen plus attributed
-- operator proposals. It is not a source archive and it does not decide claims.

CREATE TABLE IF NOT EXISTS quire_specimen_mirrors_v0 (
  specimen_id TEXT NOT NULL CHECK (specimen_id = 'review-adequacy-v1'),
  version_ordinal INTEGER NOT NULL CHECK (version_ordinal > 0),
  source_repo TEXT NOT NULL CHECK (source_repo = 'EarthlyHandsWorkshop/EarthlyHands.org'),
  source_path TEXT NOT NULL CHECK (source_path = 'experiments/follow-one-claim/data/review-adequacy-v1.json'),
  source_commit_sha TEXT NOT NULL CHECK (length(source_commit_sha) = 40),
  source_blob_sha TEXT NOT NULL CHECK (length(source_blob_sha) = 40),
  body_sha256 TEXT NOT NULL CHECK (length(body_sha256) = 64),
  body_json TEXT NOT NULL CHECK (json_valid(body_json)),
  mirror_state TEXT NOT NULL DEFAULT 'repo-governed-mirror' CHECK (mirror_state = 'repo-governed-mirror'),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (specimen_id, version_ordinal),
  UNIQUE (specimen_id, source_blob_sha)
);

CREATE TRIGGER IF NOT EXISTS quire_specimen_mirrors_v0_no_update
BEFORE UPDATE ON quire_specimen_mirrors_v0
BEGIN SELECT RAISE(ABORT, 'quire_specimen_mirror_immutable'); END;

CREATE TRIGGER IF NOT EXISTS quire_specimen_mirrors_v0_no_delete
BEFORE DELETE ON quire_specimen_mirrors_v0
BEGIN SELECT RAISE(ABORT, 'quire_specimen_mirror_immutable'); END;

CREATE TABLE IF NOT EXISTS quire_operator_requests_v0 (
  request_key TEXT NOT NULL UNIQUE,
  request_id TEXT PRIMARY KEY NOT NULL,
  actor_account_hash TEXT NOT NULL CHECK (length(actor_account_hash) = 64),
  actor_authentication TEXT NOT NULL DEFAULT 'cloudflare-access' CHECK (actor_authentication = 'cloudflare-access'),
  identity_boundary TEXT NOT NULL DEFAULT 'account-authenticated; companion-label-unverified' CHECK (identity_boundary = 'account-authenticated; companion-label-unverified'),
  specimen_id TEXT NOT NULL,
  specimen_ordinal INTEGER NOT NULL,
  specimen_sha256 TEXT NOT NULL CHECK (length(specimen_sha256) = 64),
  question TEXT NOT NULL CHECK (length(question) BETWEEN 1 AND 1200),
  loaded_carrier_ids_json TEXT NOT NULL CHECK (json_valid(loaded_carrier_ids_json)),
  input_sha256 TEXT NOT NULL CHECK (length(input_sha256) = 64),
  model_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (specimen_id, specimen_ordinal)
    REFERENCES quire_specimen_mirrors_v0(specimen_id, version_ordinal),
  UNIQUE (request_key, actor_account_hash, input_sha256)
);

CREATE INDEX IF NOT EXISTS idx_quire_operator_requests_actor_time_v0
  ON quire_operator_requests_v0(actor_account_hash, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quire_operator_requests_specimen_time_v0
  ON quire_operator_requests_v0(specimen_id, specimen_ordinal, created_at DESC);

CREATE TRIGGER IF NOT EXISTS quire_operator_requests_v0_no_update
BEFORE UPDATE ON quire_operator_requests_v0
BEGIN SELECT RAISE(ABORT, 'quire_operator_request_append_only'); END;

CREATE TRIGGER IF NOT EXISTS quire_operator_requests_v0_no_delete
BEFORE DELETE ON quire_operator_requests_v0
BEGIN SELECT RAISE(ABORT, 'quire_operator_request_append_only'); END;

-- Enforce the per-account hourly limit in SQLite too, so simultaneous
-- requests cannot race past the fast pre-check in the Worker.
CREATE TRIGGER IF NOT EXISTS quire_operator_requests_v0_rate_limit
BEFORE INSERT ON quire_operator_requests_v0
WHEN (SELECT COUNT(*) FROM quire_operator_requests_v0
      WHERE actor_account_hash=NEW.actor_account_hash
        AND created_at >= strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 hour')) >= 8
BEGIN SELECT RAISE(ABORT, 'quire_operator_rate_limit'); END;

CREATE TABLE IF NOT EXISTS quire_operator_results_v0 (
  result_id TEXT PRIMARY KEY NOT NULL,
  request_key TEXT NOT NULL UNIQUE REFERENCES quire_operator_requests_v0(request_key),
  outcome TEXT NOT NULL CHECK (outcome IN ('model-proposed-open','model-failed')),
  proposal_json TEXT CHECK (proposal_json IS NULL OR json_valid(proposal_json)),
  error_code TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK ((outcome = 'model-proposed-open' AND proposal_json IS NOT NULL AND error_code IS NULL)
      OR (outcome = 'model-failed' AND proposal_json IS NULL AND error_code IS NOT NULL))
);

CREATE TRIGGER IF NOT EXISTS quire_operator_results_v0_no_update
BEFORE UPDATE ON quire_operator_results_v0
BEGIN SELECT RAISE(ABORT, 'quire_operator_result_append_only'); END;

CREATE TRIGGER IF NOT EXISTS quire_operator_results_v0_no_delete
BEFORE DELETE ON quire_operator_results_v0
BEGIN SELECT RAISE(ABORT, 'quire_operator_result_append_only'); END;

CREATE VIEW IF NOT EXISTS quire_operator_proposals_latest_v0 AS
SELECT r.request_id,r.request_key,r.actor_account_hash,r.actor_authentication,
       r.identity_boundary,r.specimen_id,r.specimen_ordinal,r.specimen_sha256,
       r.question,r.loaded_carrier_ids_json,r.input_sha256,r.model_id,
       o.result_id,o.proposal_json,r.created_at AS requested_at,o.created_at AS proposed_at
FROM quire_operator_requests_v0 r
JOIN quire_operator_results_v0 o ON o.request_key=r.request_key
WHERE o.outcome='model-proposed-open';

-- One inspectable row per operator request, including failures and any
-- request left pending by an interrupted invocation. Event IDs make stable
-- keyset pagination possible without hiding the older end of the road.
CREATE VIEW IF NOT EXISTS quire_operator_history_v0 AS
SELECT r.request_id,r.request_key,
       COALESCE(o.result_id,r.request_id) AS event_id,
       r.actor_account_hash,r.actor_authentication,r.identity_boundary,
       r.specimen_id,r.specimen_ordinal,r.specimen_sha256,r.question,
       r.loaded_carrier_ids_json,r.input_sha256,r.model_id,
       COALESCE(o.outcome,'request-pending') AS outcome,
       o.proposal_json,o.error_code,r.created_at AS requested_at,
       o.created_at AS resolved_at,
       COALESCE(o.created_at,r.created_at) AS event_at
FROM quire_operator_requests_v0 r
LEFT JOIN quire_operator_results_v0 o ON o.request_key=r.request_key;
