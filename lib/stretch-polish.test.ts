import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import FeedTabs from "@/components/feed/FeedTabs";

const root = process.cwd();

describe("stretch empty / a11y polish", () => {
  it("both feed tabs stay in the Tab order (no roving tabindex without arrow keys)", () => {
    for (const tab of ["latest", "following"] as const) {
      const html = renderToStaticMarkup(createElement(FeedTabs, { tab }));
      const tabs = html.match(/<a\b[^>]*role="tab"[^>]*>/g) ?? [];
      expect(tabs).toHaveLength(2);
      for (const anchor of tabs) expect(anchor).not.toMatch(/tabindex=/i);
      expect(html).toMatch(/id="feed-tab-latest"[^>]*aria-controls="feed-panel"/);
      expect(html).toMatch(/id="feed-tab-following"[^>]*aria-controls="feed-panel"/);
      expect(html).toMatch(/href="\/feed\?tab=following"/);
    }
  });

  it("keeps portfolio share and brand intro intact", () => {
    const profile = readFileSync(join(root, "app/(app)/profile/[username]/page.tsx"), "utf8");
    expect(profile).toMatch(/SharePortfolioButton/);
    const brand = readFileSync(join(root, "components/brand/SameHereBrand.tsx"), "utf8");
    expect(brand).toMatch(/samehere-brand-mark/);
  });

  it("Following empty states point to search and Latest", () => {
    const feed = readFileSync(join(root, "app/(app)/feed/page.tsx"), "utf8");
    expect(feed).toMatch(/Follow people to shape this feed/);
    expect(feed).toMatch(/Quiet for now/);
    expect(feed).toMatch(/href: "\/search"/);
    expect(feed).toMatch(/href: "\/feed"/);
    expect(feed).not.toMatch(/href: "\/community"/);
  });

  it("search idle and page search are labeled", () => {
    const idle = readFileSync(join(root, "components/search/SearchIdle.tsx"), "utf8");
    expect(idle).toMatch(/Browse Latest/);
    const bar = readFileSync(join(root, "components/search/SearchBar.tsx"), "utf8");
    expect(bar).toMatch(/aria-label="Search people, projects, and posts"/);
    expect(bar).toMatch(/role="search"/);
  });

  it("landing exposes a skip link into the hero", () => {
    const page = readFileSync(join(root, "components/landing/LandingPage.tsx"), "utf8");
    expect(page).toMatch(/landing-skip-link/);
    expect(page).toMatch(/#main-content/);
    const hero = readFileSync(join(root, "components/landing/Hero.tsx"), "utf8");
    expect(hero).toMatch(/id="main-content"/);
  });

  it("primary routes ship loading or error boundaries", () => {
    for (const rel of [
      "app/loading.tsx",
      "app/(app)/feed/error.tsx",
      "app/(app)/search/error.tsx",
      "app/(app)/profile/[username]/error.tsx",
      "app/(auth)/loading.tsx",
      "app/(app)/profile/projects/new/loading.tsx",
    ]) {
      expect(readFileSync(join(root, rel), "utf8").length).toBeGreaterThan(20);
    }
  });
});
