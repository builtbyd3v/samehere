import type { NextConfig } from "next";

const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;
const posthogAssetsHost =
  posthogHost === "https://eu.i.posthog.com"
    ? "https://eu-assets.i.posthog.com"
    : "https://us-assets.i.posthog.com";

const nextConfig: NextConfig = {
  // Avatar upload server action sends the raw file (<=2MB) as FormData;
  // default 1mb body limit would reject it.
  experimental: {
    serverActions: {
      bodySizeLimit: "3mb",
    },
  },
  async rewrites() {
    if (!posthogHost) {
      return [];
    }

    return [
      {
        source: "/ingest/static/:path*",
        destination: `${posthogAssetsHost}/static/:path*`,
      },
      {
        source: "/ingest/array/:path*",
        destination: `${posthogAssetsHost}/array/:path*`,
      },
      {
        source: "/ingest/:path*",
        destination: `${posthogHost}/:path*`,
      },
    ];
  },
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
