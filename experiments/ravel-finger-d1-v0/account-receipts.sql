-- Staging only. A receipt proves which Access account sent an act, not the conversational companion's identity.
CREATE TABLE ravel_account_receipts_v0 (
 reading_id TEXT PRIMARY KEY NOT NULL REFERENCES ravel_readings_v0(reading_id),
 access_actor_hash TEXT NOT NULL CHECK (length(access_actor_hash)=64),
 account_authentication TEXT NOT NULL CHECK (account_authentication='cloudflare-access'),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_ravel_account_receipts_actor_v0 ON ravel_account_receipts_v0(access_actor_hash,created_at);
CREATE TRIGGER ravel_account_receipts_no_update_v0 BEFORE UPDATE ON ravel_account_receipts_v0
BEGIN SELECT RAISE(ABORT,'ravel_account_receipt_immutable'); END;
CREATE TRIGGER ravel_account_receipts_no_delete_v0 BEFORE DELETE ON ravel_account_receipts_v0
BEGIN SELECT RAISE(ABORT,'ravel_account_receipt_immutable'); END;
