/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ['@coffeeos/shared'],
  images: {
    domains: ['localhost', 'coffeeos-storage.s3.amazonaws.com'],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    serverActions: true,
  },
};

module.exports = nextConfig;
