-- Disposable, invented-content staging fixture. Not Workshop archival schema.
CREATE TABLE IF NOT EXISTS shared_fixture (
  id TEXT PRIMARY KEY CHECK (id = 'fictional-door'),
  version INTEGER NOT NULL CHECK (version BETWEEN 0 AND 100),
  body TEXT NOT NULL,
  last_actor TEXT NOT NULL,
  last_request_key TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS shared_fixture_history (
  id TEXT NOT NULL,
  version INTEGER NOT NULL,
  body TEXT NOT NULL,
  actor TEXT NOT NULL,
  request_key TEXT NOT NULL UNIQUE,
  changed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (id, version)
);
CREATE TRIGGER IF NOT EXISTS fixture_revision_receipt
AFTER UPDATE OF version, body ON shared_fixture
BEGIN
  INSERT INTO shared_fixture_history (id, version, body, actor, request_key)
  VALUES (NEW.id, NEW.version, NEW.body, NEW.last_actor, NEW.last_request_key);
END;
INSERT OR IGNORE INTO shared_fixture(id, version, body, last_actor, last_request_key)
VALUES ('fictional-door', 0, 'Two hands, one invented page. Nothing here is historical source.', 'system', 'seed');
