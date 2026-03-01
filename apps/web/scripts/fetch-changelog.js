#!/usr/bin/env node
/**
 * Fetches CHANGELOG.md from the monorepo root or GitHub if not available locally.
 * Runs as a prebuild step so next.config.js can read the file.
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

// Write to both cwd and the app directory to cover all resolution paths
const destinations = [
  path.join(process.cwd(), "CHANGELOG.md"),
  path.join(__dirname, "..", "CHANGELOG.md"),
];

// Try local filesystem first
const candidates = [
  path.join(__dirname, "..", "..", "..", "CHANGELOG.md"),
  path.join(process.cwd(), "CHANGELOG.md"),
  path.join(process.cwd(), "..", "..", "CHANGELOG.md"),
];

for (const src of candidates) {
  try {
    const content = fs.readFileSync(src, "utf-8");
    if (content.length > 0) {
      for (const d of destinations) {
        try { fs.writeFileSync(d, content); } catch {}
      }
      console.log(`[fetch-changelog] Copied from ${src} (${content.length} bytes)`);
      process.exit(0);
    }
  } catch {}
}

// Fetch from GitHub
console.log("[fetch-changelog] Not found locally, fetching from GitHub...");
const url =
  "https://raw.githubusercontent.com/vinay-lgtm-code/kontext_verify/main/CHANGELOG.md";

https
  .get(url, (res) => {
    if (res.statusCode !== 200) {
      console.log(`[fetch-changelog] GitHub returned ${res.statusCode}, skipping`);
      process.exit(0);
    }
    let data = "";
    res.on("data", (chunk) => (data += chunk));
    res.on("end", () => {
      for (const d of destinations) {
        try { fs.writeFileSync(d, data); } catch {}
      }
      console.log(`[fetch-changelog] Downloaded from GitHub (${data.length} bytes)`);
    });
  })
  .on("error", (err) => {
    console.log(`[fetch-changelog] Fetch failed: ${err.message}, skipping`);
  });
