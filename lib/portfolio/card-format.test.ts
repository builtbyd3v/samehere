import { describe, expect, it } from "vitest";
import { SITE_URL } from "@/lib/site";
import {
  CARD_FORMATS,
  CARD_SIZES,
  cardCacheControl,
  cardFilename,
  cardPath,
  cardUrlText,
  isCardUsername,
  parseCardFormat,
} from "./card-format";

describe("portfolio card format helpers", () => {
  it("defaults a missing or empty format to landscape", () => {
    expect(parseCardFormat(null)).toBe("landscape");
    expect(parseCardFormat("")).toBe("landscape");
  });

  it("accepts every known format as itself", () => {
    expect(parseCardFormat("landscape")).toBe("landscape");
    expect(parseCardFormat("square")).toBe("square");
    expect(parseCardFormat("story")).toBe("story");
  });

  it("rejects unknown, miscased, and path-like formats", () => {
    expect(parseCardFormat("Story")).toBeNull();
    expect(parseCardFormat("poster")).toBeNull();
    expect(parseCardFormat("../x")).toBeNull();
  });

  it("pins the three sizes, one per format", () => {
    expect(CARD_SIZES).toEqual({
      landscape: { width: 1200, height: 630 },
      square: { width: 1080, height: 1080 },
      story: { width: 1080, height: 1920 },
    });
    expect(Object.keys(CARD_SIZES).sort()).toEqual([...CARD_FORMATS].sort());
  });

  it("names the download after the user and format", () => {
    expect(cardFilename("ada", "story")).toBe("samehere-ada-story.png");
  });

  it("builds the route path with the format query", () => {
    expect(cardPath("ada", "square")).toBe("/profile/ada/card?format=square");
  });

  it("prints the share URL without scheme or www", () => {
    const expected = `${SITE_URL}/profile/ada`.replace(/^https?:\/\/(www\.)?/, "");
    expect(cardUrlText("ada")).toBe(expected);
    expect(cardUrlText("ada")).not.toMatch(/^http/);
  });

  it("guards usernames with the portfolio username shape", () => {
    expect(isCardUsername("ada_1")).toBe(true);
    expect(isCardUsername("")).toBe(false);
    expect(isCardUsername("a/b")).toBe(false);
    expect(isCardUsername("x".repeat(33))).toBe(false);
  });

  it("keeps signed-in renders private and lets a CDN cache anonymous ones", () => {
    expect(cardCacheControl(true)).toBe("private, max-age=300");
    expect(cardCacheControl(false).startsWith("public")).toBe(true);
    expect(cardCacheControl(false)).toContain("s-maxage=300");
  });
});
