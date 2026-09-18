import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  SITE_OG_DESCRIPTION,
  SITE_OG_TITLE,
  postShareTitle,
  profileShareDescription,
  profileShareTitle,
} from "./copy";

describe("og share copy", () => {
  it("keeps landing / root titles on the hero voice", () => {
    expect(SITE_OG_TITLE).toMatch(/Find your people/);
    expect(SITE_OG_TITLE).toMatch(/Show what you’re building/);
    expect(SITE_OG_DESCRIPTION).toMatch(/CS students/);
  });

  it("makes portfolio unfurls read as portfolios, not bios", () => {
    expect(profileShareTitle("Ada")).toBe("Ada on samehere");
    expect(profileShareDescription("ada")).toContain("@ada");
    expect(profileShareDescription("ada")).toMatch(/portfolio/i);
    expect(profileShareDescription("ada")).not.toMatch(/bio|goals/i);
  });

  it("names the author clearly on post shares", () => {
    expect(postShareTitle("Ada", "ada")).toBe("Ada (@ada) on samehere");
  });

  it("landing + layout metadata import the shared copy constants", () => {
    const landing = readFileSync("app/page.tsx", "utf8");
    const layout = readFileSync("app/layout.tsx", "utf8");
    expect(landing).toMatch(/SITE_OG_TITLE/);
    expect(landing).toMatch(/SITE_OG_DESCRIPTION/);
    expect(layout).toMatch(/SITE_OG_TITLE/);
    expect(layout).toMatch(/SITE_OG_DESCRIPTION/);
    expect(landing).not.toMatch(/Build something\. Find people who get it/);
  });
});
