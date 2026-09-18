import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CTA } from "./copy-voice";

// Lock: Find-people CTAs land on /search idle, which must show suggested people
// (right rail is xl-only). See store docs/onboarding-find-people-audit.md.
//
// Keep the #40 component lock and the copy-voice lock. Feed actions read
// CTA.findPeople, which is what feed/page.tsx renders after the copy-voice pass.

const SEARCH_IDLE_PEOPLE = "components/search/SearchIdlePeople.tsx";

describe.skipIf(!existsSync(SEARCH_IDLE_PEOPLE))("search idle suggested people", () => {
  it("idle /search renders SearchIdlePeople", () => {
    const page = readFileSync("app/(app)/search/page.tsx", "utf8");
    expect(page).toMatch(/import SearchIdlePeople from ["']@\/components\/search\/SearchIdlePeople["']/);
    expect(page).toMatch(/<SearchIdlePeople\s*\/>/);
  });

  it("SearchIdlePeople uses get_suggested_profiles + FollowButton", () => {
    const src = readFileSync(SEARCH_IDLE_PEOPLE, "utf8");
    expect(src).toMatch(/get_suggested_profiles/);
    expect(src).toMatch(/FollowButton/);
    expect(src).toMatch(/People you should meet/);
  });
});

describe("feed Find people CTA", () => {
  it("reads Find people from the shared copy voice", () => {
    expect(CTA.findPeople).toBe("Find people");
  });

  it("every Find people action in the feed points at /search", () => {
    const feed = readFileSync("app/(app)/feed/page.tsx", "utf8");
    const hrefs = [...feed.matchAll(/label: CTA\.findPeople, href: "([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs.length).toBeGreaterThan(0);
    expect(new Set(hrefs)).toEqual(new Set(["/search"]));
  });
});
