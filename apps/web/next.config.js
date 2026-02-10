const fs = require("fs");
const path = require("path");

// Read CHANGELOG.md at config time and inject as env var.
// __dirname is always apps/web — reliable across local dev and Vercel.
let changelogContent = "";
const changelogCandidates = [
  path.join(__dirname, "..", "..", "CHANGELOG.md"),
  path.join(__dirname, "CHANGELOG.md"),
  path.join(process.cwd(), "CHANGELOG.md"),
  path.join(process.cwd(), "..", "..", "CHANGELOG.md"),
];
console.log("[changelog] __dirname =", __dirname);
console.log("[changelog] cwd =", process.cwd());
for (const p of changelogCandidates) {
  try {
    changelogContent = fs.readFileSync(p, "utf-8");
    console.log("[changelog] Found at:", p, "length:", changelogContent.length);
    break;
  } catch {
    console.log("[changelog] Not found:", p);
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // The monorepo root .eslintrc.json extends "prettier" which isn't available
    // in Vercel's isolated build. Lint is run separately in CI.
    ignoreDuringBuilds: true,
  },
  env: {
    CHANGELOG_CONTENT: changelogContent,
  },
};

module.exports = nextConfig;
