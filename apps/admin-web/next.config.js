/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ['@coffeeos/shared'],

  // Suprimir warnings de props no serializables en componentes client
  typescript: {
    ignoreBuildErrors: false, // Mantener errores reales
  },

  // Configuración de webpack para suprimir warnings específicos
  webpack: (config, { isServer }) => {
    // Suprimir warnings de serialización en desarrollo
    if (!isServer) {
      config.infrastructureLogging = {
        level: 'error',
      };
    }
    return config;
  },

  images: {
    domains: ['localhost', 'coffeeos-storage.s3.amazonaws.com'],
    formats: ['image/avif', 'image/webp'],
  },
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1',
  },
};

module.exports = nextConfig;
