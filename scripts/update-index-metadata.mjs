import fs from "node:fs";
import { execFileSync } from "node:child_process";

const indexPath = "experiments/index.html";
const outputPath = "experiments/index-metadata.json";
const html = fs.readFileSync(indexPath, "utf8");

const specialWatch = {
  "/experiments/shared-country/": [
    "experiments/shared-country",
    "script.js",
    "style.css",
    "data/dawson"
  ],
  "/mcr879.html": ["mcr879.html", "mcr879.css"]
};

function defaultWatch(href) {
  if (href.startsWith("/experiments/")) {
    return [href.replace(/^\//, "").replace(/\/$/, "")];
  }
  return [href.replace(/^\//, "")];
}

function lastCommit(paths) {
  try {
    const out = execFileSync(
      "git",
      ["log", "-1", "--format=%H%x09%cI%x09%an%x09%B", "--", ...paths],
      { encoding: "utf8" }
    ).trim();
    if (!out) return null;
    const [sha, iso, author, ...bodyParts] = out.split("\t");
    return { sha, iso, author, body: bodyParts.join("\t") };
  } catch {
    return null;
  }
}

function handFromCommit(commit, fallback) {
  const match = commit?.body?.match(/(?:^|\n)Hand:\s*(.+?)\s*(?:\n|$)/i);
  if (match) return match[1].trim();
  return fallback || commit?.author || "Workshop";
}

const entries = {};
const articleRe = /<article class="work">[\s\S]*?<a class="work-link" href="([^"]+)">[\s\S]*?<\/a><\/article>/g;
let match;
while ((match = articleRe.exec(html))) {
  const block = match[0];
  const href = match[1];
  const handMatch = block.match(/<dt>hand<\/dt><dd>([\s\S]*?)<\/dd>/);
  const fallbackHand = handMatch
    ? handMatch[1].replace(/<[^>]+>/g, "").trim()
    : "";
  const paths = specialWatch[href] || defaultWatch(href);
  const commit = lastCommit(paths);
  if (!commit) continue;
  entries[href] = {
    updated: commit.iso,
    hand: handFromCommit(commit, fallbackHand),
    commit: commit.sha.slice(0, 12),
    watch: paths
  };
}

fs.writeFileSync(
  outputPath,
  JSON.stringify(
    {
      generated: new Date().toISOString(),
      source: "git history",
      entries
    },
    null,
    2
  ) + "\n"
);
