import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "fonts.gstatic.com" },
      { protocol: "https", hostname: "fonts.googleapis.com" },
    ],
    // Unoptimized for local dev to avoid needing sharp
    unoptimized: process.env.NODE_ENV === "development",
  },
  // Suppress TypeScript errors from dynamic tailwind classes at build
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
