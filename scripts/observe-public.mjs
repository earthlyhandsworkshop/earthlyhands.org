import fs from "node:fs/promises";
import crypto from "node:crypto";

const base = (process.env.PUBLIC_BASE_URL || "https://earthlyhands.org").replace(/\/$/, "");
const commit = process.env.GITHUB_SHA || "manual";
async function collectPublicExperimentFiles(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const localPath = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      out.push(...await collectPublicExperimentFiles(localPath));
      continue;
    }
    if (!/\.(?:html|css|js)$/.test(entry.name)) continue;
    const publicPath = entry.name === "index.html"
      ? `/${dir}/`
      : `/${localPath}`;
    out.push([localPath, publicPath]);
  }
  return out;
}

const files = [
  ["index.html", "/"],
  ["style.css", "/style.css"],
  ["script.js", "/script.js"],
  ["config.js", "/config.js"],
  ["mcr879.html", "/mcr879.html"],
  ["mcr879.css", "/mcr879.css"],
  ...await collectPublicExperimentFiles("experiments")
];

const experimentDirs = [...new Set(
  files
    .filter(([localPath]) => /^experiments\/[^/]+\/index\.html$/.test(localPath))
    .map(([localPath]) => localPath.split("/")[1])
)].sort();

const [rootIndexSource, experimentsIndexSource] = await Promise.all([
  fs.readFile("index.html", "utf8"),
  fs.readFile("experiments/index.html", "utf8")
]);

const indexedExperimentDirs = (source) =>
  new Set([...source.matchAll(/href="\/experiments\/([^/]+)\//g)].map((m) => m[1]));

const rootIndexDirs = indexedExperimentDirs(rootIndexSource);
const experimentsIndexDirs = indexedExperimentDirs(experimentsIndexSource);
const missingFromRootIndex = experimentDirs.filter((dir) => !rootIndexDirs.has(dir));
const missingFromExperimentsIndex = experimentDirs.filter((dir) => !experimentsIndexDirs.has(dir));

const sha256 = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

const observation = {
  observed_at: new Date().toISOString(),
  requested_commit: commit,
  public_base_url: base,
  files: [],
  experiment_index: {
    discovered: experimentDirs,
    missing_from_root_index: missingFromRootIndex,
    missing_from_experiments_index: missingFromExperimentsIndex
  }
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
  `Root index includes every experiment: **${missingFromRootIndex.length === 0 ? "yes" : "no"}**`,
  `Experiments index includes every experiment: **${missingFromExperimentsIndex.length === 0 ? "yes" : "no"}**`,
  missingFromRootIndex.length ? `Missing from root index: ${missingFromRootIndex.join(", ")}` : "",
  missingFromExperimentsIndex.length ? `Missing from experiments index: ${missingFromExperimentsIndex.join(", ")}` : "",
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
if (missingFromRootIndex.length || missingFromExperimentsIndex.length) process.exitCode = 4;
