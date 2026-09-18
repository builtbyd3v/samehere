import { describe, expect, it } from "vitest";
import {
  discoveryHref,
  hasDiscoveryFilters,
  parseDiscoveryFilters,
  postsDiscoveryHref,
  toggleFilter,
} from "./discovery";

describe("parseDiscoveryFilters", () => {
  it("allowlists facets and drops junk", () => {
    expect(
      parseDiscoveryFilters({
        tag: "study",
        year: "junior",
        major: "Computer Science",
        mode: "online",
        label: "stuck",
      })
    ).toEqual({
      tag: "study",
      year: "junior",
      major: "Computer Science",
      mode: "online",
      label: "stuck",
    });
    expect(parseDiscoveryFilters({ tag: "hiring", year: "13", mode: "remote", label: "shipping" })).toEqual({
      tag: null,
      year: null,
      major: null,
      mode: null,
      label: null,
    });
  });

  it("strips filter-injection chars from major", () => {
    expect(parseDiscoveryFilters({ major: "CS,()*%" }).major).toBe("CS");
  });
});

describe("discoveryHref / toggleFilter", () => {
  it("builds browse URLs without a keyword", () => {
    const filters = parseDiscoveryFilters({ tag: "study", mode: "online" });
    expect(hasDiscoveryFilters(filters)).toBe(true);
    expect(discoveryHref({ filters })).toBe("/search?tag=study&mode=online");
    expect(toggleFilter(filters, "tag", "study")).toBe("/search?mode=online");
    expect(postsDiscoveryHref("", { ...filters, label: "stuck" })).toBe("/search/posts?label=stuck");
  });
});
