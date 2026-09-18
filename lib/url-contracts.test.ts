import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FEED_FILTER_LABELS, feedPath, parseFeedView } from "@/lib/feed-label";
import { discoveryHref, parseDiscoveryFilters } from "@/lib/discovery";
import { profileSharePath } from "@/lib/portfolio/share";

/**
 * Lightweight route/query contract lock for overnight Bet 1 / Bet 2 surfaces.
 * Helpers define the URLs; feature PRs wire them into pages without changing shapes.
 */
describe("URL query contracts", () => {
  it("locks /feed?label=stuck|learning|building", () => {
    expect(FEED_FILTER_LABELS).toEqual(["stuck", "learning", "building"]);
    for (const label of FEED_FILTER_LABELS) {
      expect(feedPath({ label })).toBe(`/feed?label=${label}`);
      expect(parseFeedView({ label })).toEqual({ tab: "latest", label });
    }
  });

  it("locks /search empty-query browse + mode/tag/label chips", () => {
    expect(discoveryHref({})).toBe("/search");
    expect(discoveryHref({ filters: parseDiscoveryFilters({ mode: "online" }) })).toBe("/search?mode=online");
    expect(discoveryHref({ filters: parseDiscoveryFilters({ tag: "study" }) })).toBe("/search?tag=study");
    expect(discoveryHref({ filters: parseDiscoveryFilters({ label: "stuck" }) })).toBe("/search?label=stuck");
  });

  it("hard-keeps portfolio share path untouched by discovery/feed queries", () => {
    expect(profileSharePath("ada")).toBe("/profile/ada");
    const share = readFileSync("lib/portfolio/share.ts", "utf8");
    const feedLabel = readFileSync("lib/feed-label.ts", "utf8");
    const discovery = readFileSync("lib/discovery.ts", "utf8");
    expect(share).toContain("profileSharePath");
    expect(feedLabel).not.toContain("/profile/");
    expect(discovery).not.toContain("/profile/");
  });
});
