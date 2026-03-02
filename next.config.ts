import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
  // @ts-ignore
  outputFileTracingIncludes: {
    '/**/*': [
      './node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
      './node_modules/pdfjs-dist/standard_fonts/**/*'
    ],
  },
  outputFileTracingExcludes: {
    '/**/*': [
      './node_modules/prisma/**/*',
      './node_modules/@prisma/engines/**/*',
      './node_modules/@prisma/engines-version/**/*',
      './node_modules/@swc/core/**/*',
      './node_modules/typescript/**/*',
      './node_modules/eslint/**/*',
      './node_modules/prettier/**/*'
    ]
  },
  serverExternalPackages: [
    '@napi-rs/canvas',
    'pdf-to-img',
    'pdfjs-dist',
    'pdf-lib',
    'sharp',
    'tesseract.js',
    'prisma',
    '@prisma/client'
  ],
};

export default nextConfig;
