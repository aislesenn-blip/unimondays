import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: [
    '@napi-rs/canvas',
    'pdf-to-img',
    'pdf-lib',
    'pdfjs-dist',
    'sharp',
    'tesseract.js',
    'prisma',
    '@prisma/client'
  ],
  outputFileTracingExcludes: {
    '**/*': [
        './node_modules/prisma/**/*',
        './node_modules/@swc/core/**/*'
    ]
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
};

export default nextConfig;
