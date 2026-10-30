-- Ravel real-source v0: private, bounded source carrier.
-- Apply only to the dedicated earthly-hands-ravel-real-v0 D1 database.
-- Never apply to earthly-hands-receiving or treat as a production migration.

PRAGMA foreign_keys = ON;

CREATE TABLE ravel_sources_v0 (
  source_id TEXT PRIMARY KEY NOT NULL,
  workset TEXT NOT NULL CHECK (workset = 'choctaw-journal-1826-refusal-and-recast-v0'),
  carrier_date TEXT NOT NULL CHECK (carrier_date IN ('1826-11-14','1826-11-15')),
  carrier_label TEXT NOT NULL CHECK (length(carrier_label) BETWEEN 1 AND 240),
  source_locator TEXT NOT NULL CHECK (length(source_locator) BETWEEN 1 AND 500),
  continuation_road TEXT NOT NULL CHECK (length(continuation_road) BETWEEN 1 AND 500),
  voice_as_carried TEXT NOT NULL CHECK (length(voice_as_carried) BETWEEN 1 AND 200),
  represented_words TEXT NOT NULL CHECK (length(represented_words) BETWEEN 1 AND 4000),
  transcription_note TEXT NOT NULL CHECK (length(transcription_note) BETWEEN 1 AND 1200),
  evidentiary_state TEXT NOT NULL DEFAULT 'source-transcription-with-road'
    CHECK (evidentiary_state = 'source-transcription-with-road'),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE ravel_assertions_v0 (
  assertion_id TEXT PRIMARY KEY NOT NULL,
  source_id TEXT NOT NULL REFERENCES ravel_sources_v0(source_id),
  source_attributed_claim TEXT NOT NULL CHECK (length(source_attributed_claim) BETWEEN 1 AND 2000),
  claim_standing TEXT NOT NULL DEFAULT 'attributed-not-adjudicated'
    CHECK (claim_standing = 'attributed-not-adjudicated'),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE ravel_pairs_v0 (
  pair_id TEXT PRIMARY KEY NOT NULL,
  workset TEXT NOT NULL CHECK (workset = 'choctaw-journal-1826-refusal-and-recast-v0'),
  left_assertion_id TEXT NOT NULL REFERENCES ravel_assertions_v0(assertion_id),
  right_assertion_id TEXT NOT NULL REFERENCES ravel_assertions_v0(assertion_id),
  question TEXT NOT NULL CHECK (length(question) BETWEEN 1 AND 1200),
  standing TEXT NOT NULL DEFAULT 'comparison-question-not-conclusion'
    CHECK (standing = 'comparison-question-not-conclusion'),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK (left_assertion_id <> right_assertion_id)
);

CREATE TABLE ravel_readings_v0 (
  reading_id TEXT PRIMARY KEY NOT NULL,
  request_key TEXT NOT NULL UNIQUE,
  pair_id TEXT NOT NULL REFERENCES ravel_pairs_v0(pair_id),
  replies_to TEXT REFERENCES ravel_readings_v0(reading_id),
  hand_label TEXT NOT NULL CHECK (length(hand_label) BETWEEN 1 AND 120),
  attribution_state TEXT NOT NULL CHECK (attribution_state IN (
    'unverified-label',
    'connected-account-access-not-person-verified'
  )),
  act TEXT NOT NULL CHECK (act IN ('propose','support','dissent','revise','withdraw')),
  reading TEXT NOT NULL CHECK (length(reading) BETWEEN 1 AND 3000),
  standing TEXT NOT NULL DEFAULT 'interpretation-not-source'
    CHECK (standing = 'interpretation-not-source'),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK (replies_to IS NULL OR replies_to <> reading_id)
);

CREATE INDEX idx_ravel_readings_pair_v0
  ON ravel_readings_v0(pair_id, created_at, reading_id);

CREATE TRIGGER ravel_sources_no_update_v0 BEFORE UPDATE ON ravel_sources_v0
BEGIN SELECT RAISE(ABORT,'ravel_source_immutable'); END;
CREATE TRIGGER ravel_sources_no_delete_v0 BEFORE DELETE ON ravel_sources_v0
BEGIN SELECT RAISE(ABORT,'ravel_source_immutable'); END;
CREATE TRIGGER ravel_assertions_no_update_v0 BEFORE UPDATE ON ravel_assertions_v0
BEGIN SELECT RAISE(ABORT,'ravel_assertion_immutable'); END;
CREATE TRIGGER ravel_assertions_no_delete_v0 BEFORE DELETE ON ravel_assertions_v0
BEGIN SELECT RAISE(ABORT,'ravel_assertion_immutable'); END;
CREATE TRIGGER ravel_pairs_no_update_v0 BEFORE UPDATE ON ravel_pairs_v0
BEGIN SELECT RAISE(ABORT,'ravel_pair_immutable'); END;
CREATE TRIGGER ravel_pairs_no_delete_v0 BEFORE DELETE ON ravel_pairs_v0
BEGIN SELECT RAISE(ABORT,'ravel_pair_immutable'); END;
CREATE TRIGGER ravel_readings_no_update_v0 BEFORE UPDATE ON ravel_readings_v0
BEGIN SELECT RAISE(ABORT,'ravel_reading_append_only'); END;
CREATE TRIGGER ravel_readings_no_delete_v0 BEFORE DELETE ON ravel_readings_v0
BEGIN SELECT RAISE(ABORT,'ravel_reading_append_only'); END;

CREATE TRIGGER ravel_readings_same_pair_v0 BEFORE INSERT ON ravel_readings_v0
WHEN NEW.replies_to IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM ravel_readings_v0 r
  WHERE r.reading_id = NEW.replies_to AND r.pair_id = NEW.pair_id
)
BEGIN SELECT RAISE(ABORT,'reply_must_share_pair'); END;
