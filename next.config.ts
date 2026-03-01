import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
    // @ts-ignore
    outputFileTracingIncludes: {
      '/**/*': [
        './node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
        './node_modules/pdfjs-dist/standard_fonts/**/*'
      ],
    },
  },
  serverExternalPackages: ['@napi-rs/canvas', 'pdf-to-img', 'pdfjs-dist'],
};

export default nextConfig;
