import type { NextConfig } from "next";

const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;
const posthogAssetsHost =
  posthogHost === "https://eu.i.posthog.com"
    ? "https://eu-assets.i.posthog.com"
    : "https://us-assets.i.posthog.com";

// Supabase Storage host — avatars (public) + post-media (private, signed URLs)
// both live under /storage/v1/object/**.
const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const isDev = process.env.NODE_ENV !== "production";

// Reuses the existing `supabaseHostname` constant already derived above
// from NEXT_PUBLIC_SUPABASE_URL — do not hardcode a host.
const supabaseHttps = supabaseHostname ? `https://${supabaseHostname}` : "";
const supabaseWss = supabaseHostname ? `wss://${supabaseHostname}` : "";

const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://va.vercel-scripts.com`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob:${supabaseHttps ? ` ${supabaseHttps}` : ""}`,
  `media-src 'self'${supabaseHttps ? ` ${supabaseHttps}` : ""}`,
  `connect-src 'self' https://va.vercel-scripts.com${supabaseHttps ? ` ${supabaseHttps}` : ""}${supabaseWss ? ` ${supabaseWss}` : ""}`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `object-src 'none'`,
  // Report-Only collector (Plan 040) — no data existed to justify enforcing
  // before this. `report-uri` (legacy, broad browser support) and
  // `report-to` (Reporting API, needs the Reporting-Endpoints header below)
  // both point at the same in-app route; harmless to ship both.
  `report-uri /api/csp-report`,
  `report-to csp-endpoint`,
].join("; ");

const nextConfig: NextConfig = {
  // Avatar upload server action sends the raw file (<=2MB) as FormData;
  // default 1mb body limit would reject it.
  experimental: {
    serverActions: {
      bodySizeLimit: "3mb",
    },
  },
  images: {
    remotePatterns: [
      ...(supabaseHostname
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHostname,
              pathname: "/storage/v1/object/**",
            },
          ]
        : []),
    ],
    // Avatar/banner URLs are cache-busted with ?v=<timestamp> on every upload
    // (app/(app)/profile/edit/actions.ts, uploadAvatar/uploadBanner) — a
    // changed image always arrives at a new URL, so the optimizer never needs
    // to re-check a URL for staleness. Safe to cache for a year.
    minimumCacheTTL: 31536000,
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
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Reporting-Endpoints",
            value: `csp-endpoint="/api/csp-report"`,
          },
          { key: "Content-Security-Policy-Report-Only", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
