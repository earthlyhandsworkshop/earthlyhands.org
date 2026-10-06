import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/worker.js";

class MockStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
    this.args = [];
  }

  bind(...args) {
    this.args = args;
    return this;
  }

  async run() {
    if (this.sql.includes("INSERT INTO folio_memberships")) {
      const [relationshipId, subjectHash, , active] = this.args;
      const key = relationshipId + ":" + subjectHash;
      if (!this.db.memberships.has(key)) {
        this.db.memberships.set(key, Number(active));
      } else if (this.sql.includes("DO UPDATE")) {
        this.db.memberships.set(key, Number(active));
      }
    }
    return { success: true };
  }

  async first() {
    if (this.sql.includes("SELECT active FROM folio_memberships")) {
      const [relationshipId, subjectHash] = this.args;
      const key = relationshipId + ":" + subjectHash;
      const active = this.db.memberships.get(key);
      return active === undefined ? null : { active };
    }
    return null;
  }

  async all() {
    return { results: [] };
  }
}

class MockDB {
  constructor() {
    this.memberships = new Map();
  }

  prepare(sql) {
    return new MockStatement(this, sql);
  }
}

async function subjectHash(identity) {
  const raw = String(identity.user_uuid || identity.id || identity.sub || identity.email || "").trim();
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function health({ identity, allowed, relationships, db = new MockDB() }) {
  const request = new Request("https://example.test/folio/health");
  const env = {
    RECEIVING_DB: db,
    FOLIO_ALLOWED_EMAILS: allowed,
    FOLIO_RELATIONSHIPS_JSON: relationships,
  };
  const ctx = {
    access: {
      async getIdentity() {
        return identity;
      },
    },
  };
  const response = await worker.fetch(request, env, ctx);
  return { response, body: await response.json(), db };
}

test("allowlisted identity resolves only through its explicit relationship mapping", async () => {
  const email = "holder@example.test";
  const { response, body } = await health({
    identity: { email },
    allowed: email,
    relationships: JSON.stringify({
      [email]: { id: "private:holder", name: "Holder" },
    }),
  });

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.relationship, "private:holder");
  assert.equal(body.relationship_name, "Holder");
});

test("allowlisted but unmapped identity fails closed", async () => {
  const email = "unmapped@example.test";
  const { response, body } = await health({
    identity: { email },
    allowed: email,
    relationships: JSON.stringify({
      "someone-else@example.test": { id: "private:someone-else", name: "Someone else" },
    }),
  });

  assert.equal(response.status, 403);
  assert.equal(body.code, "folio_relationship_unresolved");
});

test("missing or malformed relationship configuration fails closed", async () => {
  const email = "holder@example.test";

  for (const relationships of ["", "{not-json"]) {
    const { response, body } = await health({
      identity: { email },
      allowed: email,
      relationships,
    });

    assert.equal(response.status, 403);
    assert.equal(body.code, "folio_relationship_unresolved");
  }
});

test("ordinary authenticated return does not reactivate an inactive membership", async () => {
  const email = "revoked@example.test";
  const relationshipId = "private:revoked";
  const identity = { email };
  const db = new MockDB();
  const hash = await subjectHash(identity);
  db.memberships.set(relationshipId + ":" + hash, 0);

  const { response, body } = await health({
    identity,
    allowed: email,
    relationships: JSON.stringify({
      [email]: { id: relationshipId, name: "Revoked holder" },
    }),
    db,
  });

  assert.equal(response.status, 403);
  assert.equal(body.code, "folio_not_authorized");
  assert.equal(db.memberships.get(relationshipId + ":" + hash), 0);
});
