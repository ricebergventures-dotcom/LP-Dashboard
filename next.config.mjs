/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // required for @react-pdf/renderer in API routes
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
  },
};

export default nextConfig;
