import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // required for @react-pdf/renderer in API routes
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
  },
};

export default nextConfig;
