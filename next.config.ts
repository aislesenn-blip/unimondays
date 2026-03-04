import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ['@napi-rs/canvas', 'pdf-to-img', 'pdf-lib', 'sharp', 'tesseract.js', 'prisma', '@prisma/client'],
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
  serverExternalPackages: [
    '@napi-rs/canvas',
    'pdf-to-img'
  ],
};

export default nextConfig;
