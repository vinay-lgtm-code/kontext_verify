const fs = require("fs");
const path = require("path");

// Read CHANGELOG.md at config time and inject as env var.
// __dirname is always apps/web — reliable across local dev and Vercel.
let changelogContent = "";
for (const p of [
  path.join(__dirname, "..", "..", "CHANGELOG.md"),
  path.join(__dirname, "CHANGELOG.md"),
]) {
  try {
    changelogContent = fs.readFileSync(p, "utf-8");
    break;
  } catch {
    // try next
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
