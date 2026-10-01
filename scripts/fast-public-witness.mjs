import fs from "node:fs/promises";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const base = (process.env.PUBLIC_BASE_URL || "https://earthlyhands.org").replace(/\/$/, "");
const before = process.env.BEFORE_SHA || "";
const head = process.env.GITHUB_SHA || "HEAD";
const maxAttempts = Number(process.env.MAX_ATTEMPTS || 8);
const delayMs = Number(process.env.DELAY_MS || 3000);

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function changedFiles() {
  try {
    if (before && !/^0+$/.test(before)) {
      return execFileSync("git", ["diff", "--name-only", before, head], {encoding:"utf8"})
        .split("\n").map(s=>s.trim()).filter(Boolean);
    }
  } catch {}
  return execFileSync("git", ["diff-tree", "--no-commit-id", "--name-only", "-r", head], {encoding:"utf8"})
    .split("\n").map(s=>s.trim()).filter(Boolean);
}

function publicPathFor(path) {
  if (path.startsWith(".github/") || path.startsWith("scripts/") || path.startsWith("worker/")) return null;
  if (path === "index.html") return "/";
  if (path.endsWith("/index.html")) return "/" + path.slice(0, -"index.html".length);
  if (/\.(?:html|css|js|json|xml|txt|md)$/.test(path)) return "/" + path;
  return null;
}

const candidates = changedFiles()
  .map(path => ({path, publicPath: publicPathFor(path)}))
  .filter(x => x.publicPath);

const results = [];
let cacheBustedLanded = true;
let ordinaryFresh = true;

for (const target of candidates) {
  let local;
  try {
    local = await fs.readFile(target.path, "utf8");
  } catch {
    continue;
  }

  const localHash = sha256(local);

  let ordinaryStatus = null;
  let ordinaryBody = "";
  let ordinaryError = null;
  try {
    const ordinaryResponse = await fetch(base + target.publicPath, {
      redirect: "follow",
      headers: {
        "user-agent": "Earthly-Hands-Fast-Public-Witness/1.1"
      }
    });
    ordinaryStatus = ordinaryResponse.status;
    ordinaryBody = await ordinaryResponse.text();
  } catch (err) {
    ordinaryError = String(err);
  }

  const ordinaryHash = ordinaryBody ? sha256(ordinaryBody) : null;
  const ordinaryMatches = ordinaryStatus === 200 && ordinaryHash === localHash;
  if (!ordinaryMatches) ordinaryFresh = false;

  let busted = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let status = null;
    let body = "";
    let error = null;

    try {
      const join = target.publicPath.includes("?") ? "&" : "?";
      const response = await fetch(base + target.publicPath + join + "ehwitness=" + encodeURIComponent(head), {
        redirect: "follow",
        cache: "no-store",
        headers: {
          "cache-control": "no-cache",
          "pragma": "no-cache",
          "user-agent": "Earthly-Hands-Fast-Public-Witness/1.1"
        }
      });
      status = response.status;
      body = await response.text();
    } catch (err) {
      error = String(err);
    }

    const publicHash = body ? sha256(body) : null;
    const matches = status === 200 && publicHash === localHash;

    busted = {
      attempt,
      status,
      matches,
      public_sha256: publicHash,
      error
    };

    if (matches) break;
    if (attempt < maxAttempts) await sleep(delayMs);
  }

  if (!busted?.matches) cacheBustedLanded = false;

  results.push({
    local_path: target.path,
    public_path: target.publicPath,
    local_sha256: localHash,
    ordinary: {
      status: ordinaryStatus,
      matches: ordinaryMatches,
      public_sha256: ordinaryHash,
      error: ordinaryError
    },
    cache_busted: busted
  });
}

const result = candidates.length === 0
  ? "NO_PUBLIC_FILES"
  : !cacheBustedLanded
    ? "STALE"
    : ordinaryFresh
      ? "LANDED"
      : "ORIGIN_CURRENT_ORDINARY_STALE";

const observation = {
  observed_at: new Date().toISOString(),
  commit: head,
  before,
  public_base_url: base,
  changed_public_files: candidates.map(x=>x.path),
  result,
  files: results
};

await fs.mkdir("fast-public-observation", {recursive:true});
await fs.writeFile("fast-public-observation/observation.json", JSON.stringify(observation,null,2)+"\n");

const lines = [
  "# Fast public witness",
  "",
  "Result: **" + observation.result + "**",
  "Commit: `" + head + "`",
  "Observed: " + observation.observed_at,
  "",
  ...(results.length ? [
    "| Public path | Ordinary HTTP | Ordinary match | Cache-busted HTTP | Cache-busted match | Attempts |",
    "|---|---:|:---:|---:|:---:|---:|",
    ...results.map(r =>
      "| `" + r.public_path + "` | " +
      (r.ordinary.status ?? "—") + " | " +
      (r.ordinary.matches ? "yes" : "no") + " | " +
      (r.cache_busted?.status ?? "—") + " | " +
      (r.cache_busted?.matches ? "yes" : "no") + " | " +
      (r.cache_busted?.attempt ?? "—") + " |"
    )
  ] : ["No public files changed in this commit."])
];

if (observation.result === "ORIGIN_CURRENT_ORDINARY_STALE") {
  lines.push(
    "",
    "The cache-busted public response matches source, but the ordinary public URL does not.",
    "Interpretation: the current deployment is reachable while ordinary delivery remains stale."
  );
}

if (process.env.GITHUB_STEP_SUMMARY) {
  await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, lines.join("\n")+"\n");
}
console.log(lines.join("\n"));

if (observation.result === "STALE") process.exitCode = 3;
