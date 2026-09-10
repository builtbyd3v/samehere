import { describe, expect, it, vi } from "vitest";
import {
  contributionLevel,
  fetchContributionYear,
  parseContributionCalendar,
  parseSyncCursor,
  rollingYearWindow,
} from "./contributions";

describe("contributionLevel", () => {
  it("maps GitHub calendar levels to 0-4 and rejects junk", () => {
    expect(contributionLevel("NONE")).toBe(0);
    expect(contributionLevel("FIRST_QUARTILE")).toBe(1);
    expect(contributionLevel("FOURTH_QUARTILE")).toBe(4);
    expect(contributionLevel(3)).toBe(3);
    expect(contributionLevel(undefined)).toBeNull();
    expect(contributionLevel("UNKNOWN")).toBeNull();
  });
});

describe("parseContributionCalendar", () => {
  it("keeps valid days and rejects malformed count or level", () => {
    const days = parseContributionCalendar({
      data: {
        user: {
          contributionsCollection: {
            contributionCalendar: {
              weeks: [
                {
                  contributionDays: [
                    { date: "2026-01-02", contributionCount: 4, contributionLevel: "SECOND_QUARTILE" },
                    { date: "2026-01-03", contributionCount: 0, contributionLevel: "NONE" },
                    { date: "bad", contributionCount: 9, contributionLevel: "FOURTH_QUARTILE" },
                    { date: "2026-01-04", contributionLevel: "FIRST_QUARTILE" },
                    { date: "2026-01-05", contributionCount: 2 },
                    { date: "2026-01-06", contributionCount: 1.5, contributionLevel: "FIRST_QUARTILE" },
                    { date: "2026-01-07", contributionCount: 3, contributionLevel: "NOPE" },
                  ],
                },
              ],
            },
          },
        },
      },
    });
    expect(days).toEqual([
      { date: "2026-01-02", count: 4, level: 2 },
      { date: "2026-01-03", count: 0, level: 0 },
    ]);
  });
});

describe("rollingYearWindow", () => {
  it("uses 365 UTC dates [today-364, today] with now as to", () => {
    const now = new Date("2026-09-10T15:00:00.000Z");
    const window = rollingYearWindow(now);
    expect(window.from).toBe("2025-09-11T00:00:00.000Z");
    expect(window.to).toBe("2026-09-10T15:00:00.000Z");
    const fromDay = Date.UTC(2025, 8, 11);
    const toDay = Date.UTC(2026, 8, 10);
    expect((toDay - fromDay) / 86_400_000 + 1).toBe(365);
    expect(Date.parse(window.to)).toBe(now.getTime());
    expect(Date.parse(window.to)).toBeLessThanOrEqual(now.getTime());
  });
});

describe("fetchContributionYear", () => {
  it("posts GraphQL to api.github.com only", async () => {
    const fetchImpl = vi.fn<(input: RequestInfo | URL) => Promise<Response>>(async (input) => {
      expect(String(input)).toBe("https://api.github.com/graphql");
      return new Response(
        JSON.stringify({
          data: {
            user: {
              contributionsCollection: {
                contributionCalendar: { weeks: [] },
              },
            },
          },
        })
      );
    });
    await expect(
      fetchContributionYear({
        token: "gho_x",
        login: "ada",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
    ).resolves.toEqual([]);
  });
});

describe("parseSyncCursor", () => {
  it("reads accepted checkpoint fields", () => {
    expect(parseSyncCursor(null)).toBeNull();
    expect(parseSyncCursor('{"v":1,"from":"a","to":"b","offset":4,"nextRetryAt":null,"backoffSeconds":30}')).toEqual({
      v: 1,
      from: "a",
      to: "b",
      offset: 4,
      nextRetryAt: null,
      backoffSeconds: 30,
    });
  });
});
