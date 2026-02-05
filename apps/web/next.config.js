/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // The monorepo root .eslintrc.json extends "prettier" which isn't available
    // in Vercel's isolated build. Lint is run separately in CI.
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
