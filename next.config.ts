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
      './node_modules/@swc/core/**/*',
      './node_modules/@swc/helpers/**/*',
      './node_modules/typescript/**/*',
      './node_modules/eslint/**/*',
      './node_modules/@playwright/test/**/*'
    ]
  },
  serverExternalPackages: [
    '@napi-rs/canvas',
    'pdf-to-img',
    'pdfjs-dist',
    'pdf-lib',
    'tesseract.js',
    'prisma',
    '@prisma/client'
  ],
};

export default nextConfig;
