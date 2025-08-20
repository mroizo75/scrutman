import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    // Allow images from various sources
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Allow any HTTPS domain
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '3000',
      },
    ],
    // Enable static file serving for uploads
    unoptimized: process.env.NODE_ENV === 'production',
  },
  // Enable static file serving from public directory
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/uploads/:path*',
      },
    ];
  },
};

export default nextConfig;
