import { describe, expect, it } from "vitest";
import {
  discoveryHref,
  hasDiscoveryFilters,
  hasPeopleFilters,
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
      }),
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

describe("discoveryHref / empty-query browse + chips", () => {
  it("builds browse URLs without a keyword", () => {
    const filters = parseDiscoveryFilters({ tag: "study", mode: "online" });
    expect(hasDiscoveryFilters(filters)).toBe(true);
    expect(hasPeopleFilters(filters)).toBe(true);
    expect(discoveryHref({ filters })).toBe("/search?tag=study&mode=online");
    expect(discoveryHref({})).toBe("/search");
    expect(toggleFilter(filters, "tag", "study")).toBe("/search?mode=online");
    expect(postsDiscoveryHref("", { ...filters, label: "stuck" })).toBe("/search/posts?label=stuck");
  });

  it("locks mode / tag / label chip query keys", () => {
    expect(discoveryHref({ filters: parseDiscoveryFilters({ mode: "hybrid" }) })).toBe("/search?mode=hybrid");
    expect(discoveryHref({ filters: parseDiscoveryFilters({ tag: "collaborate" }) })).toBe(
      "/search?tag=collaborate",
    );
    expect(discoveryHref({ filters: parseDiscoveryFilters({ label: "learning" }) })).toBe(
      "/search?label=learning",
    );
    expect(
      discoveryHref({
        filters: parseDiscoveryFilters({ mode: "self_taught", tag: "feedback", label: "building" }),
      }),
    ).toBe("/search?tag=feedback&mode=self_taught&label=building");
  });

  it("keeps empty-query browse distinct from keyword search", () => {
    const chips = parseDiscoveryFilters({ mode: "online", label: "stuck" });
    expect(hasDiscoveryFilters(chips)).toBe(true);
    expect(discoveryHref({ q: "", filters: chips })).toBe("/search?mode=online&label=stuck");
    expect(discoveryHref({ q: "   ", filters: chips })).toBe("/search?mode=online&label=stuck");
    expect(discoveryHref({ q: "rust", filters: chips })).toBe("/search?q=rust&mode=online&label=stuck");
  });
});
