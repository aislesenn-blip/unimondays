import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
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
