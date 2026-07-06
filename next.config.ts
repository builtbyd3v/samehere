import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Avatar upload server action sends the raw file (<=2MB) as FormData;
  // default 1mb body limit would reject it.
  experimental: {
    serverActions: {
      bodySizeLimit: "3mb",
    },
  },
};

export default nextConfig;
