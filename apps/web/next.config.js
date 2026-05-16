/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@blueprint/shared'],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

module.exports = nextConfig;
