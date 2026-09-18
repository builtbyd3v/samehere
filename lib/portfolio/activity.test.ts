import { describe, expect, it } from "vitest";
import {
  GITHUB_STALE_MS,
  activityHeadline,
  classifyGithubActivity,
  githubSnapshotKnown,
  mergeActivityDays,
} from "./activity";
import type { GithubContributionDay } from "@/types/portfolio";

const gh = (
  date: string,
  count: number,
  level = 1,
  fetchedAt = "2026-09-10T00:00:00.000Z"
): GithubContributionDay => ({
  connection_id: "c1",
  owner_id: "o1",
  contribution_date: date,
  contribution_count: count,
  contribution_level: level,
  fetched_at: fetchedAt,
});

describe("classifyGithubActivity", () => {
  it("treats public contribution rows as a snapshot without owner connection status", () => {
    const days = [gh("2026-09-07", 2)];
    expect(classifyGithubActivity(null, days, new Date("2026-09-10T01:00:00.000Z"))).toEqual({
      kind: "ready",
      lastSyncedAt: "2026-09-10T00:00:00.000Z",
      days,
    });
  });

  it("marks an old public snapshot stale from fetched_at, and still keeps the rows", () => {
    const fetchedAt = "2026-09-08T00:00:00.000Z";
    const days = [gh("2026-09-07", 2, 1, fetchedAt)];
    const now = new Date(Date.parse(fetchedAt) + GITHUB_STALE_MS + 1);
    expect(classifyGithubActivity(null, days, now)).toEqual({
      kind: "stale",
      lastSyncedAt: fetchedAt,
      lastSyncError: null,
      days,
    });
  });

  it("does not treat a first sync failure as a known empty year", () => {
    const firstFail = classifyGithubActivity(
      { status: "connected", last_synced_at: null, last_sync_error: "upstream timeout" },
      [],
      new Date("2026-09-10T01:00:00.000Z")
    );
    expect(firstFail).toMatchObject({ kind: "failed", lastSyncedAt: null, days: [] });
    expect(githubSnapshotKnown(firstFail)).toBe(false);
    expect(activityHeadline("github", mergeActivityDays([], [], "github"), firstFail).value).toBeNull();
    expect(
      githubSnapshotKnown({
        kind: "failed",
        lastSyncError: "upstream timeout",
        lastSyncedAt: "2026-09-10T00:00:00.000Z",
        days: [],
      })
    ).toBe(true);
  });

  it("distinguishes forthcoming, pending, empty, stale, and failed", () => {
    expect(classifyGithubActivity(null, [])).toEqual({ kind: "forthcoming" });
    expect(
      classifyGithubActivity(
        { status: "connected", last_synced_at: null, last_sync_error: null },
        [],
        new Date("2026-09-10T01:00:00.000Z")
      )
    ).toEqual({ kind: "pending" });
    expect(
      classifyGithubActivity(
        { status: "connected", last_synced_at: "2026-09-10T00:00:00.000Z", last_sync_error: null },
        [],
        new Date("2026-09-10T01:00:00.000Z")
      )
    ).toEqual({ kind: "empty", lastSyncedAt: "2026-09-10T00:00:00.000Z" });
    expect(
      classifyGithubActivity(
        {
          status: "connected",
          last_synced_at: "2026-09-08T00:00:00.000Z",
          last_sync_error: null,
        },
        [gh("2026-09-07", 2)],
        new Date(Date.parse("2026-09-08T00:00:00.000Z") + GITHUB_STALE_MS + 1)
      ).kind
    ).toBe("stale");
    expect(
      classifyGithubActivity(
        {
          status: "connected",
          last_synced_at: "2026-09-10T00:00:00.000Z",
          last_sync_error: "rate limited",
        },
        [gh("2026-09-09", 4)]
      )
    ).toMatchObject({ kind: "failed", lastSyncError: "rate limited" });
    expect(
      classifyGithubActivity(
        { status: "reauthorization_needed", last_synced_at: null, last_sync_error: null },
        []
      )
    ).toEqual({ kind: "unavailable", status: "reauthorization_needed" });
  });
});

describe("mergeActivityDays", () => {
  it("never adds Samehere points to GitHub counts on All", () => {
    const cells = mergeActivityDays(
      [{ day: "2026-09-01", points: 10, breakdown: { post: 10 } }],
      [gh("2026-09-01", 4, 2)],
      "all"
    );
    expect(cells).toHaveLength(1);
    expect(cells[0].sameherePoints).toBe(10);
    expect(cells[0].githubCount).toBe(4);
    expect(cells[0].intensity).toBe(3);
    expect(cells[0].intensity).not.toBe(14);
    expect(cells[0].sources).toEqual(["samehere", "github"]);
    expect(activityHeadline("all", cells, { kind: "ready", lastSyncedAt: "2026-09-10T00:00:00.000Z", days: [] })).toEqual({
      value: 1,
      label: "active days in the last year",
    });
  });

  it("does not report a successful zero when GitHub data is still unknown", () => {
    const emptyCells = mergeActivityDays([], [], "github");
    expect(activityHeadline("github", emptyCells, { kind: "forthcoming" }).value).toBeNull();
    expect(activityHeadline("github", emptyCells, { kind: "pending" }).value).toBeNull();
    expect(activityHeadline("github", emptyCells, { kind: "unavailable", status: "disconnected" }).value).toBeNull();
    expect(activityHeadline("github", emptyCells, { kind: "empty", lastSyncedAt: "2026-09-10T00:00:00.000Z" })).toEqual({
      value: 0,
      label: "GitHub contributions in the last year",
    });
    expect(activityHeadline("all", emptyCells, { kind: "forthcoming" })).toEqual({
      value: 0,
      label: "Samehere active days — GitHub activity isn’t available yet",
    });
  });

  it("keeps provider dates and Samehere dates on their own filters", () => {
    const samehere = [{ day: "2026-09-01", points: 2, breakdown: {} }];
    const github = [gh("2026-09-02", 5, 3)];
    expect(mergeActivityDays(samehere, github, "samehere")).toEqual([
      expect.objectContaining({ date: "2026-09-01", sameherePoints: 2, githubCount: 0 }),
    ]);
    expect(mergeActivityDays(samehere, github, "github")).toEqual([
      expect.objectContaining({ date: "2026-09-02", githubCount: 5, sameherePoints: 0 }),
    ]);
  });
});
