import { existsSync } from "node:fs";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Features from "@/components/landing/Features";
import FinaleCta from "@/components/landing/FinaleCta";
import Hero from "@/components/landing/Hero";

describe("landing page", () => {
  it("hero is server markup with the headline, an example-labeled preview, and no placeholder people", () => {
    const html = renderToString(createElement(Hero));
    for (const text of ["Find the people at your exact stage.", 'id="main-content"', 'href="/signup"']) {
      expect(html).toContain(text);
    }
    expect(html).not.toMatch(/Maya|Rivera|mayabuilds|NO RECRUITERS|NO FEED ALGORITHM/i);
    expect(html).not.toMatch(/font-serif|font-mono|NEW<|role="img"/);
    // The pill advertises export, so plan 007's card route must exist.
    expect(existsSync("app/(app)/profile/[username]/card/route.tsx")).toBe(true);
  });

  it("feature copy has no invented numbers and only claims shipped features", () => {
    const html = renderToString(createElement(Features));
    for (const id of ['id="stages"', 'id="portfolio"', 'id="unstuck"', 'id="how"']) expect(html).toContain(id);
    expect(html).not.toMatch(/Solved in \d+|follower race/i);
    expect(html).not.toMatch(/>0[1-3]</);
    const exportLive = existsSync("lib/portfolio/card-format.ts");
    const solvedLive = existsSync("components/feed/StuckResolveButton.tsx");
    if (!exportLive) expect(html).not.toMatch(/export as an image|Link · Square · Story/i);
    if (!solvedLive) {
      expect(html).not.toMatch(/Marked solved|Mark it solved/);
    }
  });

  it("finale is a plain line with no serif accent or glow", () => {
    const html = renderToString(createElement(FinaleCta));
    expect(html).toContain("You&#x27;re not the only one.");
    expect(html).not.toMatch(/font-serif|radial-gradient/);
  });
});
