const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // The monorepo root .eslintrc.json extends "prettier" which isn't available
    // in Vercel's isolated build. Lint is run separately in CI.
    ignoreDuringBuilds: true,
  },
  // Include monorepo root files (CHANGELOG.md) in serverless function bundles
  outputFileTracingRoot: path.join(__dirname, "..", ".."),
};

module.exports = nextConfig;
