/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['kontext-sdk'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

module.exports = nextConfig;
