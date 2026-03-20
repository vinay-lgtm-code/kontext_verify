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
  env: {
    CHANGELOG_CONTENT: readChangelogSync(),
  },
  async rewrites() {
    return [
      {
        source: "/products",
        destination: "/enterprise-products.html",
      },
      {
        source: "/use-cases",
        destination: "/enterprise-use-cases.html",
      },
    ];
  },
};

module.exports = nextConfig;
