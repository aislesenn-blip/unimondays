import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ['@napi-rs/canvas', 'pdf-to-img', 'pdf-lib', 'pdfjs-dist', 'sharp', 'tesseract.js', 'prisma', '@prisma/client'],
  outputFileTracingIncludes: {
    '/api/**/*': [
      './node_modules/pdfjs-dist/build/pdf.worker.mjs',
      './node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
      './node_modules/pdfjs-dist/standard_fonts/**/*'
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
};

export default nextConfig;
