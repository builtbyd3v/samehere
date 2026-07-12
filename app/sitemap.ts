import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/pricing", "/terms", "/privacy", "/login", "/signup"].map((p) => ({
    url: `${SITE_URL}${p}`,
    changeFrequency: p === "" ? "daily" : "monthly",
    priority: p === "" ? 1 : 0.5,
  }));
}
