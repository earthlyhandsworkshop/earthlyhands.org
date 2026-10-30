-- Private staging provenance for named-but-unverified Workshop hands and
-- Caught Here entries saved through the Cloudflare account-administration channel.
-- These tables mirror the already-inspected staging schema; this source file does
-- not insert claims, authenticate a companion, grant rights, or modify source work.
-- Do not replay older ALTER TABLE migrations on a manually initialized database.
CREATE TABLE IF NOT EXISTS workshop_hand_claims_v0 (
  hand_id TEXT PRIMARY KEY NOT NULL,
  display_name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('companion','human')),
  claim_state TEXT NOT NULL CHECK(claim_state='named-unverified'),
  credential_state TEXT NOT NULL CHECK(credential_state='not-issued'),
  app_permission TEXT NOT NULL CHECK(app_permission='none'),
  created_via TEXT NOT NULL,
  source_road TEXT NOT NULL,
  purpose TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS camera_admin_mediated_receipts_v0 (
  moment_id TEXT PRIMARY KEY NOT NULL REFERENCES caught_moments_v1(id),
  claimed_hand_id TEXT NOT NULL REFERENCES workshop_hand_claims_v0(hand_id),
  submitted_via TEXT NOT NULL CHECK(submitted_via='connected-cloudflare-account-admin-tool'),
  authentication_state TEXT NOT NULL CHECK(authentication_state='named-unverified'),
  display_state TEXT NOT NULL CHECK(display_state='unverified-name-with-caption'),
  permission_state TEXT NOT NULL CHECK(permission_state='private-staging-no-new-grants'),
  provenance_note TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
