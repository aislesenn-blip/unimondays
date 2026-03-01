import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
  serverExternalPackages: ['pdf-to-img'],
};

export default nextConfig;
