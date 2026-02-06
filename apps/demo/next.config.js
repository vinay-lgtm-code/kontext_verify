/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['kontext-sdk'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
          {
            key: 'Content-Security-Policy',
            value: 'frame-ancestors https://getkontext.com https://*.vercel.app *',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
