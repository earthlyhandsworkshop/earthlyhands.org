import fs from "node:fs/promises";
import crypto from "node:crypto";

const base = (process.env.PUBLIC_BASE_URL || "https://earthlyhands.org").replace(/\/$/, "");
const commit = process.env.GITHUB_SHA || "manual";
const files = [
  ["index.html", "/"],
  ["style.css", "/style.css"],
  ["script.js", "/script.js"],
  ["config.js", "/config.js"],
  ["experiments/shared-country/index.html", "/experiments/shared-country/"],
  ["experiments/follow-the-carrier/index.html", "/experiments/follow-the-carrier/"],
  ["experiments/follow-the-carrier/style.css", "/experiments/follow-the-carrier/style.css"],
  ["experiments/follow-the-carrier/script.js", "/experiments/follow-the-carrier/script.js"],
  ["mcr879.html", "/mcr879.html"],
  ["mcr879.css", "/mcr879.css"]
];

const sha256 = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

const observation = {
  observed_at: new Date().toISOString(),
  requested_commit: commit,
  public_base_url: base,
  files: []
};

for (const [localPath, publicPath] of files) {
  const local = await fs.readFile(localPath, "utf8");
  let response;
  let body = "";
  let error = null;

  try {
    response = await fetch(base + publicPath, {
      redirect: "follow",
      headers: { "user-agent": "Earthly-Hands-Public-Observer/1.0" }
    });
    body = await response.text();
  } catch (err) {
    error = String(err);
  }

  const item = {
    local_path: localPath,
    public_path: publicPath,
    http_status: response?.status ?? null,
    final_url: response?.url ?? null,
    local_sha256: sha256(local),
    public_sha256: body ? sha256(body) : null,
    matches_source: body ? sha256(local) === sha256(body) : false,
    error
  };

  observation.files.push(item);
}

observation.all_observed = observation.files.every((f) => f.http_status === 200);
observation.all_match_source = observation.files.every((f) => f.matches_source);

await fs.mkdir("public-observation", { recursive: true });
await fs.writeFile(
  "public-observation/observation.json",
  JSON.stringify(observation, null, 2) + "\n",
  "utf8"
);

const lines = [
  "# Earthly Hands public observation",
  "",
  `Observed: ${observation.observed_at}`,
  `Requested commit: \`${commit}\``,
  `Public ground: ${base}`,
  "",
  `All observed: **${observation.all_observed ? "yes" : "no"}**`,
  `All checked files match repository source: **${observation.all_match_source ? "yes" : "no"}**`,
  "",
  "| Public path | HTTP | Matches source | Final URL |",
  "|---|---:|:---:|---|",
  ...observation.files.map((f) =>
    `| \`${f.public_path}\` | ${f.http_status ?? "—"} | ${f.matches_source ? "yes" : "no"} | ${f.final_url ?? "—"} |`
  ),
  "",
  "This observation is deployment evidence only. It does not change the historical or epistemic standing of the public material."
];

await fs.writeFile(
  "public-observation/summary.md",
  lines.join("\n") + "\n",
  "utf8"
);

if (process.env.GITHUB_STEP_SUMMARY) {
  await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, lines.join("\n") + "\n");
}

if (!observation.all_observed) process.exitCode = 2;
if (!observation.all_match_source) process.exitCode = 3;
