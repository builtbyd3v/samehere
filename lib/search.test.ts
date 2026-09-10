import { describe, it, expect } from "vitest";
import {
  tokensFor,
  clampSearchLimit,
  clampSearchOffset,
  parseSearchPage,
  searchPageOffset,
  searchHref,
  projectSearchHref,
  postsSearchHref,
  nextSearchOffset,
  compareSearchRank,
  PG_INT4_MAX,
  SEARCH_PAGE_MAX,
  paginateRanked,
  SEARCH_PAGE,
  type SearchRankRow,
} from "./search";
import { TEXT_LIMITS } from "./utils/validation";

describe("tokensFor", () => {
  it("lowercases and splits a plain multi-word query", () => {
    expect(tokensFor("computer science")).toEqual(["computer", "science"]);
  });

  it("strips PostgREST-dangerous chars and quotes", () => {
    expect(tokensFor("a,b(c)*%")).toEqual(["abc"]);
    expect(tokensFor("username.ilike.%x%")).toEqual(["usernameilikex"]);
    expect(tokensFor(`a"b'c`)).toEqual(["abc"]);
  });

  it("returns [] for empty or whitespace-only input", () => {
    expect(tokensFor("")).toEqual([]);
    expect(tokensFor("   ")).toEqual([]);
  });

  it("keeps the first 8 tokens after empty-token filter", () => {
    expect(tokensFor("one two three four five six seven eight nine ten")).toEqual([
      "one", "two", "three", "four", "five", "six", "seven", "eight",
    ]);
    expect(tokensFor("one two --- three four five six seven eight nine ten")).toEqual([
      "one", "two", "three", "four", "five", "six", "seven", "eight",
    ]);
  });

  it("slices input longer than TEXT_LIMITS.searchQuery before tokenizing", () => {
    const long = "a".repeat(TEXT_LIMITS.searchQuery + 50);
    const tokens = tokensFor(long);
    expect(tokens.length).toBe(1);
    expect(tokens[0].length).toBeLessThanOrEqual(TEXT_LIMITS.searchQuery);
  });

  it("every returned token is [a-z0-9]+ only", () => {
    const tokens = tokensFor(`weird,()*%\\input"with'punct.tuation`);
    for (const t of tokens) {
      expect(t).toMatch(/^[a-z0-9]+$/);
    }
  });
});

describe("search page bounds", () => {
  it("caps page size at 20", () => {
    expect(clampSearchLimit(100)).toBe(SEARCH_PAGE);
    expect(clampSearchLimit(0)).toBe(1);
    expect(clampSearchLimit(-3)).toBe(1);
  });

  it("floors offset at 0", () => {
    expect(clampSearchOffset(-10)).toBe(0);
    expect(clampSearchOffset(40)).toBe(40);
  });

  it("rejects junk and int4 overflow back to 0 / page 1", () => {
    expect(clampSearchOffset("nope")).toBe(0);
    expect(clampSearchOffset(PG_INT4_MAX + 1)).toBe(0);
    expect(clampSearchOffset(1e20)).toBe(0);
    expect(clampSearchOffset(PG_INT4_MAX)).toBe(PG_INT4_MAX);
    expect(parseSearchPage("1e20")).toBe(1);
    expect(parseSearchPage(SEARCH_PAGE_MAX + 1)).toBe(1);
    expect(parseSearchPage(SEARCH_PAGE_MAX)).toBe(SEARCH_PAGE_MAX);
    expect(searchPageOffset(SEARCH_PAGE_MAX)).toBeLessThanOrEqual(PG_INT4_MAX);
    expect(nextSearchOffset(PG_INT4_MAX - 1)).toBeNull();
    expect(nextSearchOffset(0)).toBe(SEARCH_PAGE);
  });
});

describe("search hrefs / parseSearchPage", () => {
  it("maps pages to offsets and keeps q plus independent type pages", () => {
    expect(parseSearchPage(undefined)).toBe(1);
    expect(parseSearchPage("0")).toBe(1);
    expect(parseSearchPage("-2")).toBe(1);
    expect(parseSearchPage("2")).toBe(2);
    expect(searchPageOffset(1)).toBe(0);
    expect(searchPageOffset(2)).toBe(SEARCH_PAGE);
    expect(searchHref({ q: "rust" })).toBe("/search?q=rust");
    expect(searchHref({ q: "rust", peoplePage: 2 })).toBe("/search?q=rust&peoplePage=2");
    expect(searchHref({ q: "rust", projectPage: 3 })).toBe("/search?q=rust&projectPage=3");
    expect(searchHref({ q: "rust", peoplePage: 2, projectPage: 3 })).toBe(
      "/search?q=rust&peoplePage=2&projectPage=3",
    );
    expect(projectSearchHref("c++", 3, 2)).toBe("/search?q=c%2B%2B&peoplePage=2&projectPage=3");
    expect(postsSearchHref("rust", 0)).toBe("/search/posts?q=rust");
    expect(postsSearchHref("rust", 40)).toBe("/search/posts?q=rust&offset=40");
    expect(postsSearchHref("rust", PG_INT4_MAX + 5)).toBe("/search/posts?q=rust");
  });
});

function row(partial: Partial<SearchRankRow> & { id: string }): SearchRankRow {
  return {
    exact: false,
    termHits: 1,
    createdAt: "2026-09-01T00:00:00.000Z",
    ...partial,
  };
}

describe("compareSearchRank / paginateRanked", () => {
  it("puts exact name/title ahead of term hits", () => {
    const exact = row({ id: "old", exact: true, termHits: 1, createdAt: "2020-01-01T00:00:00.000Z" });
    const many = row({ id: "new", exact: false, termHits: 8, createdAt: "2026-09-10T00:00:00.000Z" });
    expect(compareSearchRank(exact, many)).toBeLessThan(0);
  });

  it("breaks remaining ties on recency then id", () => {
    const a = row({ id: "aaa", termHits: 2, createdAt: "2026-09-10T00:00:00.000Z" });
    const b = row({ id: "bbb", termHits: 2, createdAt: "2026-09-10T00:00:00.000Z" });
    expect(compareSearchRank(a, b)).toBeGreaterThan(0);
    expect(compareSearchRank(b, a)).toBeLessThan(0);
  });

  it("filters first: hidden rows never consume a page slot", () => {
    const visible = [
      row({ id: "a", createdAt: "2026-09-10T00:00:00.000Z" }),
      row({ id: "b", createdAt: "2026-09-09T00:00:00.000Z" }),
      row({ id: "c", createdAt: "2026-09-08T00:00:00.000Z" }),
    ];
    const page = paginateRanked(visible, 2, 0);
    expect(page.map((r) => r.id)).toEqual(["a", "b"]);
    expect(paginateRanked(visible, 2, 2).map((r) => r.id)).toEqual(["c"]);
  });
});
