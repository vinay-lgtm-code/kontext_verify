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
  async redirects() {
    return [
      { source: '/audiences/ai-agent-startups', destination: '/audiences/fintech-startups', permanent: true },
      { source: '/audiences/defi-protocols', destination: '/audiences/payment-platforms', permanent: true },
      { source: '/audiences/stablecoin-issuers', destination: '/audiences/treasury-ops', permanent: true },
      { source: '/blog/introducing-kontext', destination: '/blog/payment-control-plane', permanent: true },
      { source: '/blog/tamper-evident-audit-trails', destination: '/blog/8-stage-payment-lifecycle', permanent: true },
      { source: '/faqs', destination: '/docs', permanent: false },
    ];
  },
};

module.exports = nextConfig;
