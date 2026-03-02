/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
    serverComponentsExternalPackages: [
      '@prisma/client',
      'prisma',
      'pdf-lib',
      'sharp',
      '@napi-rs/canvas',
      'pdf-to-img',
      'pdfjs-dist',
    ],
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.node$/,
      use: 'node-loader',
    });
    return config;
  },
};

export default nextConfig;
