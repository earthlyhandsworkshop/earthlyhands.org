-- Ravel / shared bench glance v0: a receiving surface for independently captured,
-- fictional instrument snapshots. NOT a canonical Workshop database migration.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS bench_crossing_runs_v0 (
  run_id TEXT PRIMARY KEY NOT NULL,
  origin_database TEXT NOT NULL,
  instrument TEXT NOT NULL,
  origin_snapshot_sha256 TEXT NOT NULL CHECK(length(origin_snapshot_sha256)=64),
  count_expected INTEGER NOT NULL CHECK(count_expected>=1),
  visibility TEXT NOT NULL CHECK(visibility='fictional-staging'),
  receipt_standing TEXT NOT NULL CHECK(receipt_standing='copy-receipt-not-source-authority'),
  copied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS bench_crossing_records_v0 (
  origin_database TEXT NOT NULL,
  origin_table TEXT NOT NULL,
  origin_id TEXT NOT NULL,
  run_id TEXT NOT NULL REFERENCES bench_crossing_runs_v0(run_id),
  instrument TEXT NOT NULL,
  source_road TEXT NOT NULL,
  source_proposition TEXT NOT NULL,
  record_kind TEXT NOT NULL CHECK(record_kind IN
    ('source-occurrence','source-assertion','interpretation','change-event')),
  source_standing TEXT NOT NULL CHECK(source_standing='invented-fixture'),
  hand_label TEXT NOT NULL,
  hand_standing TEXT NOT NULL CHECK(hand_standing='unverified-test-label'),
  source_verb TEXT NOT NULL,
  occurrence_order INTEGER NOT NULL CHECK(occurrence_order>=0),
  payload_json TEXT NOT NULL CHECK(json_valid(payload_json)),
  payload_sha256 TEXT NOT NULL CHECK(length(payload_sha256)=64),
  PRIMARY KEY(origin_database,origin_table,origin_id),
  UNIQUE(run_id,origin_table,origin_id)
);

CREATE VIEW IF NOT EXISTS bench_glance_v0 AS
SELECT r.origin_database, r.origin_table, r.origin_id,
       r.instrument, r.source_road, r.source_proposition,
       r.record_kind, r.source_standing, r.hand_label, r.hand_standing,
       r.source_verb, r.occurrence_order, r.payload_sha256,
       c.origin_snapshot_sha256, c.run_id, c.copied_at,
       c.receipt_standing
  FROM bench_crossing_records_v0 r
  JOIN bench_crossing_runs_v0 c ON c.run_id=r.run_id;

-- Retire the misleading v0 view in disposable copies; it ranked dissent as if
-- a later interpretation superseded another reading. Source rows are untouched.
DROP VIEW IF EXISTS bench_latest_event_by_proposition_v0;

-- Event chronology is not interpretive consensus. One can observe the last
-- change in a fictional transition without choosing between separate readings.
CREATE VIEW IF NOT EXISTS bench_latest_change_by_proposition_v1 AS
SELECT * FROM (
  SELECT r.*,
    ROW_NUMBER() OVER (
      PARTITION BY origin_database,instrument,source_road,source_proposition
      ORDER BY occurrence_order DESC,origin_table DESC,origin_id DESC
    ) AS event_rank
  FROM bench_crossing_records_v0 r
  WHERE record_kind='change-event'
) WHERE event_rank=1;

-- Every interpretation stays visible, including dissent; no last-write-wins.
CREATE VIEW IF NOT EXISTS bench_readings_by_proposition_v1 AS
SELECT r.origin_database,r.origin_table,r.origin_id,r.instrument,
       r.source_road,r.source_proposition,r.source_verb,r.occurrence_order,
       r.hand_label,r.hand_standing,r.source_standing,r.payload_json,
       r.payload_sha256,c.run_id,c.receipt_standing
  FROM bench_crossing_records_v0 r
  JOIN bench_crossing_runs_v0 c ON c.run_id=r.run_id
 WHERE r.record_kind='interpretation';

CREATE TRIGGER IF NOT EXISTS bench_runs_no_update_v0
BEFORE UPDATE ON bench_crossing_runs_v0 BEGIN
  SELECT RAISE(ABORT, 'bench_run_receipt_immutable');
END;
CREATE TRIGGER IF NOT EXISTS bench_runs_no_delete_v0
BEFORE DELETE ON bench_crossing_runs_v0 BEGIN
  SELECT RAISE(ABORT, 'bench_run_receipt_immutable');
END;
CREATE TRIGGER IF NOT EXISTS bench_records_no_update_v0
BEFORE UPDATE ON bench_crossing_records_v0 BEGIN
  SELECT RAISE(ABORT, 'bench_crossing_record_immutable');
END;
CREATE TRIGGER IF NOT EXISTS bench_records_no_delete_v0
BEFORE DELETE ON bench_crossing_records_v0 BEGIN
  SELECT RAISE(ABORT, 'bench_crossing_record_immutable');
END;
