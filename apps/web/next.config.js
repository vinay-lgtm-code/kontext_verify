const fs = require("fs");
const path = require("path");

// Read CHANGELOG.md — try local filesystem first, then fetch from GitHub.
function readChangelogSync() {
  for (const p of [
    path.join(__dirname, "..", "..", "CHANGELOG.md"),
    path.join(__dirname, "CHANGELOG.md"),
    path.join(process.cwd(), "CHANGELOG.md"),
  ]) {
    try {
      const c = fs.readFileSync(p, "utf-8");
      if (c.length > 0) return c;
    } catch {}
  }
  return "";
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    CHANGELOG_CONTENT: readChangelogSync(),
  },
};

module.exports = nextConfig;
