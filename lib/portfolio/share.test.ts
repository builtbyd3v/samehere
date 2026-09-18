import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SITE_URL } from "@/lib/site";
import { profileSharePath, profileShareUrl } from "./share";

describe("portfolio share URL", () => {
  it("hard-keeps canonical path /profile/[username] (absolute URL for native share)", () => {
    expect(profileSharePath("ada")).toBe("/profile/ada");
    expect(profileShareUrl("ada")).toBe(`${SITE_URL}/profile/ada`);
    expect(profileShareUrl("ada")).toMatch(/^https:\/\//);
    expect(profileShareUrl("ada")).not.toBe(profileSharePath("ada"));
  });

  it("SharePortfolioButton native share uses profileShareUrl", () => {
    const src = readFileSync("components/portfolio/SharePortfolioButton.tsx", "utf8");
    expect(src).toMatch(/import \{ profileShareUrl \} from ["']@\/lib\/portfolio\/share["']/);
    expect(src).not.toMatch(/profileSharePath/);
    expect(src).toMatch(/navigator\.share\(/);
    expect(src).not.toMatch(/url:\s*path/);
    expect(src).not.toMatch(/url:\s*profileSharePath/);
    expect(src).toMatch(/navigator\.share\(\{ title: `\$\{displayName\} on samehere`, url, text: `@\$\{username\}` \}\)/);
    expect(src).toMatch(/navigator\.clipboard\.writeText\(url\)/);
  });

  it("profile page still renders SharePortfolioButton", () => {
    const src = readFileSync("app/(app)/profile/[username]/page.tsx", "utf8");
    expect(src).toMatch(/import SharePortfolioButton from ["']@\/components\/portfolio\/SharePortfolioButton["']/);
    expect(src.match(/<SharePortfolioButton /g)?.length).toBeGreaterThanOrEqual(1);
  });

  it("share helpers stay path-only — no feed/search query bleed", () => {
    const src = readFileSync("lib/portfolio/share.ts", "utf8");
    expect(src).toMatch(/return `\/profile\/\$\{username\}`/);
    expect(src).not.toMatch(/label=/);
    expect(src).not.toMatch(/mode=/);
    expect(src).not.toMatch(/\/feed/);
    expect(src).not.toMatch(/\/search/);
  });
});
