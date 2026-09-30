import { existsSync } from "node:fs";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Features from "@/components/landing/Features";
import Hero from "@/components/landing/Hero";
import HeroPreview from "@/components/landing/HeroPreview";
import StageMarquee from "@/components/landing/StageMarquee";
import { STAGE_LABELS } from "@/lib/stage";

describe("landing page", () => {
  it("hero is server markup with the headline, an example-labeled preview, and no placeholder people", () => {
    const html = renderToString(createElement(Hero));
    for (const text of [
      "Find the people at your",
      "exact",
      'id="main-content"',
      'role="img"',
      "Illustration, not a real account",
      "Export your profile as a story card",
      'href="/signup"',
    ]) {
      expect(html).toContain(text);
    }
    expect(html).not.toMatch(/Maya|Rivera|mayabuilds|NO RECRUITERS|NO FEED ALGORITHM/i);
    // The pill advertises export, so plan 007's card route must exist.
    expect(existsSync("app/(app)/profile/[username]/card/route.tsx")).toBe(true);
  });

  it("feature copy has no invented numbers and only claims shipped features", () => {
    const html = renderToString(createElement(Features));
    for (const id of ['id="portfolio"', 'id="unstuck"', 'id="how"']) expect(html).toContain(id);
    expect(html).not.toMatch(/Solved in \d+|follower race/i);
    const exportLive = existsSync("lib/portfolio/card-format.ts");
    const solvedLive = existsSync("components/feed/StuckResolveButton.tsx");
    if (!exportLive) expect(html).not.toMatch(/export as an image|Link · Square · Story/i);
    if (!solvedLive) {
      expect(html).not.toMatch(/Marked solved|Mark it solved/);
      expect(renderToString(createElement(HeroPreview))).not.toMatch(/Solved by/);
    }
  });

  it("stage marquee exposes one list to screen readers", () => {
    const html = renderToString(createElement(StageMarquee));
    expect(html).toContain('id="stages"');
    expect(html.match(/<ul/g)).toHaveLength(4);
    expect(html.match(/<ul aria-hidden="true"/g)).toHaveLength(3);
    for (const label of Object.values(STAGE_LABELS)) expect(html).toContain(label);
  });
});
