import { describe, it, expect } from "vitest";
import {
  FEED_FILTER_LABELS,
  FOLLOWING_SEED_MAX,
  feedPath,
  parseFeedView,
  shouldSeedFollowing,
  stuckReplyPath,
} from "./feed-label";

describe("FEED_FILTER_LABELS", () => {
  it("surfaces Stuck first, then Learning, Building, and Looking for team", () => {
    expect(FEED_FILTER_LABELS).toEqual(["stuck", "learning", "building", "looking_for_team"]);
  });

  it("routes the Looking for team chip through the same label filter", () => {
    expect(feedPath({ label: "looking_for_team" })).toBe("/feed?label=looking_for_team");
    expect(parseFeedView({ tab: "following", label: "looking_for_team" })).toEqual({
      tab: "latest",
      label: "looking_for_team",
    });
  });
});

describe("feedPath", () => {
  it("defaults to Latest", () => {
    expect(feedPath()).toBe("/feed");
    expect(feedPath({ tab: "latest" })).toBe("/feed");
  });

  it("uses the following tab query", () => {
    expect(feedPath({ tab: "following" })).toBe("/feed?tab=following");
  });

  it("makes a label filter network-wide and drops the following tab", () => {
    expect(feedPath({ label: "stuck" })).toBe("/feed?label=stuck");
    expect(feedPath({ tab: "following", label: "learning" })).toBe("/feed?label=learning");
  });
});

describe("parseFeedView", () => {
  it("reads Latest / Following", () => {
    expect(parseFeedView({})).toEqual({ tab: "latest", label: null });
    expect(parseFeedView({ tab: "following" })).toEqual({ tab: "following", label: null });
  });

  it("treats a valid label as Latest + filter", () => {
    expect(parseFeedView({ label: "Stuck" })).toEqual({ tab: "latest", label: "stuck" });
    expect(parseFeedView({ tab: "following", label: "building" })).toEqual({
      tab: "latest",
      label: "building",
    });
  });

  it("ignores junk labels instead of 404ing", () => {
    expect(parseFeedView({ label: "intern" })).toEqual({ tab: "latest", label: null });
  });
});

describe("shouldSeedFollowing", () => {
  it("seeds until the viewer follows 5 people", () => {
    expect(FOLLOWING_SEED_MAX).toBe(5);
    expect(shouldSeedFollowing(0)).toBe(true);
    expect(shouldSeedFollowing(4)).toBe(true);
    expect(shouldSeedFollowing(5)).toBe(false);
  });
});

describe("stuckReplyPath", () => {
  it("opens the post comment composer", () => {
    expect(stuckReplyPath("11111111-1111-1111-1111-111111111111")).toBe(
      "/post/11111111-1111-1111-1111-111111111111?reply=1",
    );
  });
});
