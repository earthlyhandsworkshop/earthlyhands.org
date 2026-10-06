import test from "node:test";
import assert from "node:assert/strict";
import {
  handleLanding,
  parseLandingDestinations,
  sha256Text,
  validMarkdownName
} from "../src/landing.js";

const env = {
  LANDING_ALLOWED_EMAILS: "ten@example.com",
  GOOGLE_OAUTH_CLIENT_ID: "client-id",
  GOOGLE_OAUTH_CLIENT_SECRET: "client-secret",
  GOOGLE_OAUTH_REFRESH_TOKEN: "refresh-token",
  WORKSHOP_DRIVE_DESTINATIONS_JSON: JSON.stringify({ "15": "folder-1234567890" })
};

const ctx = {
  access: {
    async getIdentity() {
      return { email: "ten@example.com" };
    }
  }
};

function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers }
  });
}

test("destination map and markdown names fail closed", () => {
  assert.deepEqual(parseLandingDestinations(env), { "15": "folder-1234567890" });
  assert.equal(validMarkdownName("FINGER — test.md"), "FINGER — test.md");
  assert.equal(validMarkdownName("../test.md"), "");
  assert.equal(validMarkdownName("test.txt"), "");
});

test("Landing Desk refuses identities outside its explicit allowlist", async () => {
  const response = await handleLanding(
    new Request("https://worker.example/landing/health"),
    env,
    { access: { async getIdentity() { return { email: "other@example.com" }; } } },
    new URL("https://worker.example/landing/health"),
    async () => { throw new Error("network should not be reached"); }
  );
  assert.equal(response.status, 403);
  assert.equal((await response.json()).code, "landing_not_authorized");
});

test("create writes raw Markdown, reads it back, and returns a verified receipt", async () => {
  const markdown = "# hello\n\nWorkshop body.\n";
  const wantedSha = await sha256Text(markdown);
  const calls = [];
  const fakeFetch = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method || "GET", body: init.body });

    if (String(url) === "https://oauth2.googleapis.com/token") {
      return jsonResponse({ access_token: "token" });
    }

    if (String(url).startsWith("https://www.googleapis.com/drive/v3/files?")) {
      return jsonResponse({ files: [] });
    }

    if (String(url).startsWith("https://www.googleapis.com/upload/drive/v3/files?")) {
      assert.equal(init.method, "POST");
      assert.match(String(init.headers["Content-Type"]), /^multipart\/related; boundary=/);
      assert.match(String(init.body), /FINGER — hello\.md/);
      assert.match(String(init.body), /Workshop body\./);
      return jsonResponse({
        id: "file-123",
        name: "FINGER — hello.md",
        mimeType: "text/markdown",
        parents: ["folder-1234567890"],
        modifiedTime: "2026-10-06T12:00:00Z",
        size: String(new TextEncoder().encode(markdown).byteLength),
        webViewLink: "https://drive.google.com/file/d/file-123/view"
      });
    }

    if (String(url).includes("/drive/v3/files/file-123?") && String(url).includes("alt=media")) {
      return new Response(markdown, { status: 200, headers: { "Content-Type": "text/markdown" } });
    }

    if (String(url).includes("/drive/v3/files/file-123?")) {
      return jsonResponse({
        id: "file-123",
        name: "FINGER — hello.md",
        mimeType: "text/markdown",
        parents: ["folder-1234567890"],
        modifiedTime: "2026-10-06T12:00:00Z",
        size: String(new TextEncoder().encode(markdown).byteLength),
        webViewLink: "https://drive.google.com/file/d/file-123/view",
        trashed: false
      });
    }

    throw new Error("unexpected URL " + url);
  };

  const request = new Request("https://worker.example/landing/markdown", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      operation: "create",
      destination: "15",
      name: "FINGER — hello.md",
      body: markdown
    })
  });

  const response = await handleLanding(request, env, ctx, new URL(request.url), fakeFetch);
  assert.equal(response.status, 201);
  const receipt = await response.json();
  assert.equal(receipt.verified, true);
  assert.equal(receipt.sha256, wantedSha);
  assert.equal(receipt.file_id, "file-123");
  assert.equal(receipt.operation, "create");
  assert.equal(calls.some((call) => call.method === "POST" && call.url.includes("/upload/drive/v3/files")), true);
});

test("update refuses a stale caller before any Drive PATCH", async () => {
  const current = "# current\n";
  const staleSha = await sha256Text("# stale\n");
  const calls = [];
  const fakeFetch = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method || "GET" });

    if (String(url) === "https://oauth2.googleapis.com/token") {
      return jsonResponse({ access_token: "token" });
    }

    if (String(url).includes("/drive/v3/files/file-123?") && String(url).includes("alt=media")) {
      return new Response(current, { status: 200, headers: { "Content-Type": "text/markdown" } });
    }

    if (String(url).includes("/drive/v3/files/file-123?")) {
      return jsonResponse({
        id: "file-123",
        name: "FINGER — hello.md",
        mimeType: "text/markdown",
        parents: ["folder-1234567890"],
        modifiedTime: "2026-10-06T12:05:00Z",
        trashed: false
      });
    }

    throw new Error("unexpected URL " + url);
  };

  const request = new Request("https://worker.example/landing/markdown", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      operation: "update",
      destination: "15",
      file_id: "file-123",
      expected_sha256: staleSha,
      body: "# next\n"
    })
  });

  const response = await handleLanding(request, env, ctx, new URL(request.url), fakeFetch);
  assert.equal(response.status, 409);
  assert.equal((await response.json()).code, "landing_stale_write");
  assert.equal(calls.some((call) => call.method === "PATCH"), false);
});
