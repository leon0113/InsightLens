import type { NextConfig } from 'next';

// The browser only ever talks to this app. Requests to /api/v1 are forwarded
// to the Express API, so the refresh cookie is a first-party cookie and no
// CORS is involved. Rewrites are fixed at build time, so BACKEND_URL must be
// set when the app is built.
const backendUrl = process.env.BACKEND_URL;
if (!backendUrl) {
  throw new Error('Missing environment variable: BACKEND_URL');
}

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // A self-contained server in .next/standalone, used by the Dockerfile.
  output: 'standalone',
  experimental: {
    // Forwarded request bodies are buffered, and cut at 10 MB by default.
    // Room for the 50 MB upload limit plus the multipart form around it.
    proxyClientMaxBodySize: '52mb',
    // A 50 MB upload on a slow connection takes longer than the 30 s default.
    proxyTimeout: 120_000,
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendUrl.replace(/\/$/, '')}/api/v1/:path*`,
      },
    ];
  },
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
