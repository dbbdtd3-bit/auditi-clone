import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'obs.eu-de.otc.t-systems.com',
      },
    ],
  },
};

export default nextConfig;
