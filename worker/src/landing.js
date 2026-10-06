const MAX_MARKDOWN_BYTES = 1024 * 1024;
const DRIVE_FILE_FIELDS = "id,name,mimeType,parents,modifiedTime,md5Checksum,size,webViewLink,trashed";

function reply(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow"
    }
  });
}

function cleanEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function parseLandingDestinations(env) {
  const raw = String(env?.WORKSHOP_DRIVE_DESTINATIONS_JSON || "").trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out = {};
    for (const [key, value] of Object.entries(parsed)) {
      const alias = String(key || "").trim().toLowerCase();
      const folderId = String(value || "").trim();
      if (/^[a-z0-9:_-]{1,80}$/.test(alias) && /^[A-Za-z0-9_-]{10,200}$/.test(folderId)) {
        out[alias] = folderId;
      }
    }
    return out;
  } catch {
    return {};
  }
}

function allowedLandingEmail(identity, env) {
  const email = cleanEmail(identity?.email);
  const allowed = String(env?.LANDING_ALLOWED_EMAILS || "")
    .split(",")
    .map(cleanEmail)
    .filter(Boolean);
  return Boolean(email && allowed.includes(email));
}

async function landingIdentity(ctx, env) {
  if (!ctx?.access) return { error: reply({ error: "Access required.", code: "landing_access_required" }, 403) };
  let identity;
  try {
    identity = await ctx.access.getIdentity();
  } catch {
    return { error: reply({ error: "Authenticated identity could not be read.", code: "landing_identity_unavailable" }, 403) };
  }
  if (!String(env?.LANDING_ALLOWED_EMAILS || "").trim()) {
    return { error: reply({ error: "Landing allowlist is not configured.", code: "landing_allowlist_missing" }, 503) };
  }
  if (!allowedLandingEmail(identity, env)) {
    return { error: reply({ error: "This identity cannot use the Landing Desk.", code: "landing_not_authorized" }, 403) };
  }
  return { identity };
}

export function validMarkdownName(value) {
  const name = String(value || "").trim();
  if (!name || name.length > 220) return "";
  if (!name.toLowerCase().endsWith(".md")) return "";
  if (/[/\\\u0000-\u001f]/u.test(name)) return "";
  return name;
}

function normalizeSha(value) {
  const sha = String(value || "").trim().toLowerCase();
  return /^[a-f0-9]{64}$/.test(sha) ? sha : "";
}

export async function sha256Text(value) {
  const bytes = new TextEncoder().encode(String(value ?? ""));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function configuredGoogle(env) {
  return Boolean(
    String(env?.GOOGLE_OAUTH_CLIENT_ID || "").trim() &&
    String(env?.GOOGLE_OAUTH_CLIENT_SECRET || "").trim() &&
    String(env?.GOOGLE_OAUTH_REFRESH_TOKEN || "").trim()
  );
}

async function googleAccessToken(env, fetchImpl) {
  if (!configuredGoogle(env)) throw new Error("landing_google_oauth_missing");
  const body = new URLSearchParams({
    client_id: String(env.GOOGLE_OAUTH_CLIENT_ID),
    client_secret: String(env.GOOGLE_OAUTH_CLIENT_SECRET),
    refresh_token: String(env.GOOGLE_OAUTH_REFRESH_TOKEN),
    grant_type: "refresh_token"
  });
  const response = await fetchImpl("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  if (!response.ok) throw new Error("landing_google_oauth_failed");
  const data = await response.json();
  const token = String(data?.access_token || "");
  if (!token) throw new Error("landing_google_oauth_failed");
  return token;
}

function driveHeaders(token, extra = {}) {
  return { Authorization: "Bearer " + token, ...extra };
}

function driveQueryLiteral(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

async function driveMetadata(token, fileId, fetchImpl) {
  const params = new URLSearchParams({
    fields: DRIVE_FILE_FIELDS,
    supportsAllDrives: "true"
  });
  const response = await fetchImpl(
    "https://www.googleapis.com/drive/v3/files/" + encodeURIComponent(fileId) + "?" + params,
    { headers: driveHeaders(token) }
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("landing_drive_metadata_failed");
  return response.json();
}

async function driveDownload(token, fileId, fetchImpl) {
  const response = await fetchImpl(
    "https://www.googleapis.com/drive/v3/files/" + encodeURIComponent(fileId) + "?alt=media&supportsAllDrives=true",
    { headers: driveHeaders(token) }
  );
  if (!response.ok) throw new Error("landing_drive_readback_failed");
  const text = await response.text();
  if (new TextEncoder().encode(text).byteLength > MAX_MARKDOWN_BYTES) throw new Error("landing_file_too_large");
  return text;
}

async function driveFindByName(token, folderId, name, fetchImpl) {
  const q = "'" + driveQueryLiteral(folderId) + "' in parents and name = '" + driveQueryLiteral(name) + "' and trashed = false";
  const params = new URLSearchParams({
    q,
    spaces: "drive",
    pageSize: "10",
    fields: "files(" + DRIVE_FILE_FIELDS + ")",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true"
  });
  const response = await fetchImpl("https://www.googleapis.com/drive/v3/files?" + params, {
    headers: driveHeaders(token)
  });
  if (!response.ok) throw new Error("landing_drive_search_failed");
  const data = await response.json();
  return Array.isArray(data?.files) ? data.files : [];
}

function multipartBody(metadata, markdown) {
  const boundary = "earthlyhands-" + crypto.randomUUID();
  const body =
    "--" + boundary + "\r\n" +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(metadata) + "\r\n" +
    "--" + boundary + "\r\n" +
    "Content-Type: text/markdown; charset=UTF-8\r\n\r\n" +
    markdown + "\r\n" +
    "--" + boundary + "--";
  return { boundary, body };
}

async function driveCreateMarkdown(token, folderId, name, markdown, fetchImpl) {
  const { boundary, body } = multipartBody(
    { name, mimeType: "text/markdown", parents: [folderId] },
    markdown
  );
  const params = new URLSearchParams({
    uploadType: "multipart",
    supportsAllDrives: "true",
    fields: DRIVE_FILE_FIELDS
  });
  const response = await fetchImpl("https://www.googleapis.com/upload/drive/v3/files?" + params, {
    method: "POST",
    headers: driveHeaders(token, { "Content-Type": "multipart/related; boundary=" + boundary }),
    body
  });
  if (!response.ok) throw new Error("landing_drive_create_failed");
  return response.json();
}

async function driveUpdateMarkdown(token, fileId, markdown, fetchImpl) {
  const params = new URLSearchParams({
    uploadType: "media",
    supportsAllDrives: "true",
    fields: DRIVE_FILE_FIELDS
  });
  const response = await fetchImpl(
    "https://www.googleapis.com/upload/drive/v3/files/" + encodeURIComponent(fileId) + "?" + params,
    {
      method: "PATCH",
      headers: driveHeaders(token, { "Content-Type": "text/markdown; charset=UTF-8" }),
      body: markdown
    }
  );
  if (!response.ok) throw new Error("landing_drive_update_failed");
  return response.json();
}

function heldByDestination(metadata, folderId) {
  return Array.isArray(metadata?.parents) && metadata.parents.includes(folderId);
}

function heldMarkdown(metadata) {
  return Boolean(
    metadata &&
    !metadata.trashed &&
    validMarkdownName(metadata.name) &&
    (metadata.mimeType === "text/markdown" || metadata.mimeType === "text/plain" || metadata.mimeType === "application/octet-stream")
  );
}

function receipt(operation, destination, metadata, sha256) {
  return {
    ok: true,
    operation,
    destination,
    file_id: metadata.id,
    name: metadata.name,
    mime_type: metadata.mimeType,
    modified_time: metadata.modifiedTime || null,
    size: metadata.size ? Number(metadata.size) : null,
    sha256,
    web_view_link: metadata.webViewLink || null,
    verified: true
  };
}

async function verifiedRead(token, fileId, fetchImpl) {
  const metadata = await driveMetadata(token, fileId, fetchImpl);
  if (!metadata) return null;
  const markdown = await driveDownload(token, fileId, fetchImpl);
  return { metadata, markdown, sha256: await sha256Text(markdown) };
}

function destinationFrom(value, destinations) {
  const alias = String(value || "").trim().toLowerCase();
  const folderId = destinations[alias];
  return folderId ? { alias, folderId } : null;
}

function bodySizeOk(markdown) {
  return new TextEncoder().encode(markdown).byteLength <= MAX_MARKDOWN_BYTES;
}

export async function handleLanding(request, env, ctx, url = new URL(request.url), fetchImpl = fetch) {
  const auth = await landingIdentity(ctx, env);
  if (auth.error) return auth.error;

  const destinations = parseLandingDestinations(env);
  const aliases = Object.keys(destinations).sort();

  if (request.method === "GET" && url.pathname === "/landing/health") {
    return reply({
      ok: true,
      private: true,
      auth: "cloudflare-access",
      drive_oauth_configured: configuredGoogle(env),
      drive_oauth_parts: {
        client_id: Boolean(String(env?.GOOGLE_OAUTH_CLIENT_ID || "").trim()),
        client_secret: Boolean(String(env?.GOOGLE_OAUTH_CLIENT_SECRET || "").trim()),
        refresh_token: Boolean(String(env?.GOOGLE_OAUTH_REFRESH_TOKEN || "").trim())
      },
      destinations: aliases,
      verbs: ["read", "create", "update"]
    });
  }

  if (!configuredGoogle(env)) {
    return reply({ error: "Google Drive OAuth is not configured.", code: "landing_google_oauth_missing" }, 503);
  }
  if (!aliases.length) {
    return reply({ error: "No Landing Desk destinations are configured.", code: "landing_destinations_missing" }, 503);
  }

  let token;
  try {
    token = await googleAccessToken(env, fetchImpl);
  } catch (error) {
    const code = String(error?.message || "landing_google_oauth_failed");
    return reply({ error: "Google Drive authorization is unavailable.", code }, 503);
  }

  if (request.method === "GET" && url.pathname === "/landing/markdown") {
    const destination = destinationFrom(url.searchParams.get("destination"), destinations);
    const fileId = String(url.searchParams.get("file_id") || "").trim();
    if (!destination || !fileId) {
      return reply({ error: "Destination and file_id are required.", code: "landing_read_incomplete" }, 400);
    }
    try {
      const current = await verifiedRead(token, fileId, fetchImpl);
      if (!current || !heldByDestination(current.metadata, destination.folderId) || !heldMarkdown(current.metadata)) {
        return reply({ error: "That Markdown file is not held by this destination.", code: "landing_file_outside_destination" }, 404);
      }
      return reply({
        ok: true,
        destination: destination.alias,
        file_id: current.metadata.id,
        name: current.metadata.name,
        modified_time: current.metadata.modifiedTime || null,
        sha256: current.sha256,
        body: current.markdown,
        verified: true
      });
    } catch (error) {
      const code = String(error?.message || "landing_read_failed");
      return reply({ error: "The Markdown body could not be read.", code }, code === "landing_file_too_large" ? 413 : 502);
    }
  }

  if (request.method === "POST" && url.pathname === "/landing/markdown") {
    let body;
    try {
      body = await request.json();
    } catch {
      return reply({ error: "Send JSON.", code: "landing_invalid_json" }, 400);
    }

    const operation = String(body?.operation || "").trim().toLowerCase();
    const destination = destinationFrom(body?.destination, destinations);
    const markdown = String(body?.body ?? "");
    if (!["create", "update"].includes(operation) || !destination) {
      return reply({ error: "Operation and configured destination are required.", code: "landing_write_incomplete" }, 400);
    }
    if (!bodySizeOk(markdown)) {
      return reply({ error: "Markdown body exceeds 1 MiB.", code: "landing_body_too_large" }, 413);
    }

    if (operation === "create") {
      const name = validMarkdownName(body?.name);
      if (!name) return reply({ error: "A valid .md filename is required.", code: "landing_name_invalid" }, 400);
      try {
        const collisions = await driveFindByName(token, destination.folderId, name, fetchImpl);
        if (collisions.length) {
          return reply({
            error: "A file with that name already exists in this destination.",
            code: "landing_name_exists",
            file_id: collisions[0].id,
            name: collisions[0].name
          }, 409);
        }
        const created = await driveCreateMarkdown(token, destination.folderId, name, markdown, fetchImpl);
        const current = await verifiedRead(token, created.id, fetchImpl);
        const expectedSha = await sha256Text(markdown);
        if (!current || !heldByDestination(current.metadata, destination.folderId) || current.sha256 !== expectedSha) {
          return reply({ error: "Drive accepted the create but readback did not verify.", code: "landing_readback_mismatch" }, 502);
        }
        return reply(receipt("create", destination.alias, current.metadata, current.sha256), 201);
      } catch (error) {
        const code = String(error?.message || "landing_create_failed");
        return reply({ error: "Markdown could not be created.", code }, 502);
      }
    }

    const fileId = String(body?.file_id || "").trim();
    const expectedSha = normalizeSha(body?.expected_sha256);
    if (!fileId || !expectedSha) {
      return reply({ error: "Update requires file_id and expected_sha256 from a fresh Landing Desk read.", code: "landing_update_guard_required" }, 400);
    }

    try {
      const before = await verifiedRead(token, fileId, fetchImpl);
      if (!before || !heldByDestination(before.metadata, destination.folderId) || !heldMarkdown(before.metadata)) {
        return reply({ error: "That Markdown file is not held by this destination.", code: "landing_file_outside_destination" }, 404);
      }
      if (before.sha256 !== expectedSha) {
        return reply({
          error: "The file changed since it was read. Read it again before updating.",
          code: "landing_stale_write",
          current_sha256: before.sha256,
          modified_time: before.metadata.modifiedTime || null
        }, 409);
      }

      await driveUpdateMarkdown(token, fileId, markdown, fetchImpl);
      const after = await verifiedRead(token, fileId, fetchImpl);
      const wantedSha = await sha256Text(markdown);
      if (!after || !heldByDestination(after.metadata, destination.folderId) || after.sha256 !== wantedSha) {
        return reply({ error: "Drive accepted the update but readback did not verify.", code: "landing_readback_mismatch" }, 502);
      }
      return reply(receipt("update", destination.alias, after.metadata, after.sha256));
    } catch (error) {
      const code = String(error?.message || "landing_update_failed");
      return reply({ error: "Markdown could not be updated.", code }, code === "landing_file_too_large" ? 413 : 502);
    }
  }

  return reply({ error: "Not found.", code: "landing_not_found" }, 404);
}
