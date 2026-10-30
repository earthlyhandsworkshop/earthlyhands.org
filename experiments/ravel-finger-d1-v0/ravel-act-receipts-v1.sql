-- Ravel / Finger / Two Source: connected-admin act receipts, private staging only.
-- Records the authenticated Workshop account road without verifying the claimed hand label.
-- Applied to earthly-hands-two-hand-staging on 2026-10-30; never apply to receiving/production.

CREATE TABLE ravel_act_receipts_v1 (
  receipt_id TEXT PRIMARY KEY NOT NULL,
  reading_id TEXT NOT NULL UNIQUE REFERENCES ravel_readings_v0(reading_id),
  access_actor_hash TEXT NOT NULL CHECK (length(access_actor_hash) = 64),
  access_road TEXT NOT NULL CHECK (access_road = 'connected-cloudflare-account-admin-tool'),
  person_identity_state TEXT NOT NULL CHECK (person_identity_state = 'account-access-not-person-verified'),
  label_relation TEXT NOT NULL CHECK (label_relation = 'access-receipt-does-not-verify-reading-hand-label'),
  scope TEXT NOT NULL CHECK (scope = 'private-staging'),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TRIGGER ravel_act_receipts_no_update_v1
BEFORE UPDATE ON ravel_act_receipts_v1
BEGIN SELECT RAISE(ABORT,'ravel_act_receipt_immutable'); END;

CREATE TRIGGER ravel_act_receipts_no_delete_v1
BEFORE DELETE ON ravel_act_receipts_v1
BEGIN SELECT RAISE(ABORT,'ravel_act_receipt_immutable'); END;
