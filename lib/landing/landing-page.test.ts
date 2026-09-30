import { existsSync } from "node:fs";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import Features from "@/components/landing/Features";
import FinaleCta from "@/components/landing/FinaleCta";
import Hero from "@/components/landing/Hero";
import { MoreExamples } from "@/components/landing/HeroPreview";
import StageMarquee from "@/components/landing/StageMarquee";
import type { LandingExample } from "@/lib/landing/examples";
import { STAGE_LABELS } from "@/lib/stage";

// The hero renders the real PostCard; stub its browser-only dependencies (vitest hoists vi.mock).
vi.mock("@/lib/supabase/client", () => ({ getBrowserClient: () => ({}) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push() {}, refresh() {}, prefetch() {} }), usePathname: () => "/" }));
vi.mock("@/components/feed/PostMenu", () => ({ default: () => null }));

const ada: LandingExample = {
  username: "ada",
  displayName: "Ada",
  avatarUrl: null,
  badges: { isPro: false, isFounder: false, isCampusFounder: false, isVerifiedStudent: false, isBot: false },
  headline: "Builds tools",
  stage: "building",
  focusAreas: ["web"],
  schoolLine: "State U · CS",
  openTo: [],
  links: { github: null, linkedin: null, website: null },
  project: {
    id: "p1",
    owner_id: "o1",
    title: "Bus tracker",
    summary: null,
    description: null,
    personal_role: null,
    technologies: [],
    key_features: [],
    repo_url: null,
    demo_url: null,
    published_at: "2026-09-01T00:00:00.000Z",
    sort_order: 0,
  },
};

describe("landing page", () => {
  it("hero fallback shows the real components with example content and no export images", () => {
    const html = renderToString(createElement(Hero, { example: null, postCreatedAt: new Date().toISOString() }));
    for (const text of [
      "Find the people at your exact stage.",
      'id="main-content"',
      'href="/signup"',
      "Example portfolio",
      "Your name",
      "Example post",
      'aria-label="Same here, 1"',
      'aria-pressed="true"',
      "inert",
    ]) {
      expect(html).toContain(text);
    }
    for (const text of ["card?format=", 'href="/profile/yourname"', 'id="examples"', "font-serif", "NEW<", 'role="img"', ">Same here<"]) {
      expect(html).not.toContain(text);
    }
    expect(html.match(/<h1/g)?.length).toBe(1);
    // The pill advertises export, so plan 007's card route must exist.
    expect(existsSync("app/(app)/profile/[username]/card/route.tsx")).toBe(true);
  });

  it("hero with a real example shows its portfolio and export images", () => {
    const html = renderToString(createElement(Hero, { example: ada, postCreatedAt: new Date().toISOString() }));
    for (const text of [
      "Live portfolio",
      'id="examples"',
      'href="/profile/ada"',
      "/profile/ada/card?format=story",
      "/profile/ada/card?format=square",
      'width="1080"',
      'height="1920"',
      "<h3",
    ]) {
      expect(html).toContain(text);
    }
    expect(html.match(/<h1/g)?.length).toBe(1);
    // Remaining accounts get compact cards below the hero; none when only one qualifies.
    expect(renderToString(createElement(MoreExamples, { examples: [] }))).toBe("");
    expect(renderToString(createElement(MoreExamples, { examples: [ada] }))).toContain('href="/profile/ada"');
  });

  it("stage strip lists every stage once for screen readers and has a pause control", () => {
    const html = renderToString(createElement(StageMarquee));
    for (const label of Object.values(STAGE_LABELS)) expect(html).toContain(label);
    expect(html).toContain('id="stage-marquee-pause"');
    expect(html).toContain('type="checkbox"');
    expect((html.match(/aria-hidden="true"/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it("features keep ids, real visuals, and no numbers", () => {
    const plain = renderToString(createElement(Features, { example: null }));
    const withAda = renderToString(createElement(Features, { example: ada }));
    for (const html of [plain, withAda]) {
      for (const id of ['id="stages"', 'id="portfolio"', 'id="unstuck"', 'id="how"']) expect(html).toContain(id);
      expect(html).toContain("Stuck · solved");
      expect(html).toContain("Link · Square · Story");
      expect(html).not.toMatch(/>0[1-3]</);
      expect(html).not.toMatch(/Solved in \d+|follower race/i);
    }
    expect(plain).not.toContain("/profile/ada/card?format=square");
    expect(withAda).toContain("/profile/ada/card?format=square");
    const exportLive = existsSync("lib/portfolio/card-format.ts");
    const solvedLive = existsSync("components/feed/StuckResolveButton.tsx");
    if (!exportLive) expect(withAda).not.toMatch(/export as an image|Link · Square · Story/i);
    if (!solvedLive) {
      expect(withAda).not.toMatch(/Marked solved|Mark it solved/);
    }
  });

  it("finale is a plain line with no serif accent or glow", () => {
    const html = renderToString(createElement(FinaleCta));
    expect(html).toContain("You&#x27;re not the only one.");
    expect(html).not.toMatch(/font-serif|radial-gradient/);
  });
});
