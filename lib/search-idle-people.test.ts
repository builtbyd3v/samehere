import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Lock: Find-people CTAs land on /search idle, which must show suggested people
// (right rail is xl-only). See store docs/onboarding-find-people-audit.md.
describe("search idle suggested people", () => {
  it("idle /search renders SearchIdlePeople", () => {
    const page = readFileSync("app/(app)/search/page.tsx", "utf8");
    expect(page).toMatch(/import SearchIdlePeople from ["']@\/components\/search\/SearchIdlePeople["']/);
    expect(page).toMatch(/<SearchIdlePeople\s*\/>/);
  });

  it("SearchIdlePeople uses get_suggested_profiles + FollowButton", () => {
    const src = readFileSync("components/search/SearchIdlePeople.tsx", "utf8");
    expect(src).toMatch(/get_suggested_profiles/);
    expect(src).toMatch(/FollowButton/);
    expect(src).toMatch(/People you should meet/);
  });

  it("feed Find people still points at /search", () => {
    const feed = readFileSync("app/(app)/feed/page.tsx", "utf8");
    expect(feed).toMatch(/label: "Find people", href: "\/search"/);
  });
});
