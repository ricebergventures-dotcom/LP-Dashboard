/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Prevent @react-pdf/renderer from being bundled into the server bundle.
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
  },

  // @react-pdf/renderer pulls in pdfkit, fontkit, and large font/binary files.
  // Exclude them from every serverless function's traced output by default,
  // then add them back only for the export route that actually needs them.
  // This keeps all other function bundles small enough to deploy on Vercel.
  outputFileTracingExcludes: {
    "**": [
      "node_modules/@react-pdf/**/*",
      "node_modules/pdfkit/**/*",
      "node_modules/fontkit/**/*",
      "node_modules/restructure/**/*",
      "node_modules/unicode-properties/**/*",
      "node_modules/linebreak/**/*",
    ],
  },
  outputFileTracingIncludes: {
    "/api/export": [
      "node_modules/@react-pdf/**/*",
      "node_modules/pdfkit/**/*",
      "node_modules/fontkit/**/*",
      "node_modules/restructure/**/*",
      "node_modules/unicode-properties/**/*",
      "node_modules/linebreak/**/*",
    ],
  },
};

export default nextConfig;
