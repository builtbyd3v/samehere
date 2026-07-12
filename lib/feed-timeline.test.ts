import { describe, it, expect } from "vitest";
import { mergeFeedTimeline, itemId } from "./feed-timeline";
import type { FeedPost } from "@/components/feed/PostCard";

function post(id: string, created_at: string): FeedPost {
  return { id, content: "x", created_at, user_id: "u", media: [], author: null } as unknown as FeedPost;
}

describe("mergeFeedTimeline", () => {
  it("sorts by created_at descending", () => {
    const items = mergeFeedTimeline([post("a", "2026-01-01T00:00:01Z"), post("b", "2026-01-01T00:00:02Z")], [], []);
    expect(items.map((i) => itemId(i))).toEqual(["b", "a"]);
  });

  it("breaks a created_at tie by id descending", () => {
    const tie = "2026-01-01T00:00:00Z";
    const items = mergeFeedTimeline([post("11111111-0000-0000-0000-000000000000", tie), post("22222222-0000-0000-0000-000000000000", tie)], [], []);
    // "22222222..." > "11111111..." lexically -- must sort first, matching
    // the SQL side's `order by created_at desc, id desc`.
    expect(items.map((i) => itemId(i))).toEqual(["22222222-0000-0000-0000-000000000000", "11111111-0000-0000-0000-000000000000"]);
  });
});
