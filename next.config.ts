
/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  // Set output to 'standalone' to leverage Vercel's automatic dependency tracing.
  // This creates a minimal '.next/standalone' folder with only necessary node_modules.
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
  // This is the most critical change: Externalize heavy packages.
  // Next.js will not bundle these into the serverless functions,
  // drastically reducing the size of your API routes.
  serverExternalPackages: [
      '@prisma/client',
      'prisma',
      'pdf-lib',
      'sharp',
      '@napi-rs/canvas',
      'pdf-to-img',
      'pdfjs-dist'
  ],
  // Aggressively exclude unnecessary Prisma query engine binaries and other large files.
  // This targets files that are not needed for the Vercel (Linux) runtime.
  outputFileTracingExcludes: {
    '**/*': [
      // Exclude all Prisma query engines except the one for Linux (debian-openssl)
      'node_modules/@prisma/engines/libquery_engine-darwin.dylib.node',
      'node_modules/@prisma/engines/libquery_engine-darwin-aarch64.dylib.node',
      'node_modules/@prisma/engines/libquery_engine-windows.dll.node',
      'node_modules/@prisma/engines/libquery_engine-freebsd*.so.node',
      'node_modules/@prisma/engines/libquery_engine-openbsd*.so.node',
      'node_modules/@prisma/engines/libquery_engine-netbsd*.so.node',
      'node_modules/@prisma/engines/libquery_engine-linux-arm64-openssl-*.so.node',
      'node_modules/@prisma/engines/libquery_engine-linux-musl*',
      'node_modules/.prisma/client/libquery_engine-debian-openssl-1.0.x.so.node',
      'node_modules/.prisma/client/libquery_engine-debian-openssl-3.0.x.so.node',
      'node_modules/.prisma/client/libquery_engine-rhel-openssl-1.0.x.so.node',
      'node_modules/.prisma_client/libquery_engine-rhel-openssl-1.1.x.so.node',
      'node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node',
      
      // Exclude other large, non-essential packages
      'node_modules/canvas/**/*',
      'node_modules/sharp/**/*',
    ],
  },
};

export default nextConfig;
