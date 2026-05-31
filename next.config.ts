import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Workers 部署所需
  experimental: {
    serverActions: {
      allowedOrigins: ['aitaskyard.com', 'www.aitaskyard.com'],
    },
  },
};

export default nextConfig;
