import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin",
          "/community",
          "/dashboard",
          "/feed",
          "/leaderboard",
          "/messages",
          "/notifications",
          "/onboarding",
          "/pro",
          "/profile/edit",
          "/referrals",
          "/saved",
          "/search",
          "/settings",
          "/auth/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
