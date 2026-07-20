import { describe, it, expect } from "vitest";
import { mergeFeedTimeline, itemId } from "./feed-timeline";
import type { FeedPost } from "@/components/feed/PostCard";
import type { PlainRepost } from "./feed-reposts";

function post(id: string, created_at: string): FeedPost {
  return { id, content: "x", created_at, user_id: "u", media: [], author: null } as unknown as FeedPost;
}

function repost(id: string, created_at: string, original: FeedPost): PlainRepost {
  return { id, created_at, original } as unknown as PlainRepost;
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

  it("renders a post once even when it is also reposted", () => {
    const p = post("p1", "2026-01-01T00:00:00Z");
    const items = mergeFeedTimeline([p], [], [repost("r1", "2026-01-02T00:00:00Z", p)]);
    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe("post");
  });

  it("keeps only the newest of several reposts of one post", () => {
    const p = post("p1", "2026-01-01T00:00:00Z");
    const items = mergeFeedTimeline(
      [],
      [],
      [repost("r-new", "2026-01-03T00:00:00Z", p), repost("r-old", "2026-01-02T00:00:00Z", p)],
    );
    expect(items.map(itemId)).toEqual(["r-new"]);
  });

  it("leaves reposts of distinct posts alone", () => {
    const a = post("a", "2026-01-01T00:00:00Z");
    const b = post("b", "2026-01-01T00:00:00Z");
    const items = mergeFeedTimeline(
      [],
      [],
      [repost("r-b", "2026-01-03T00:00:00Z", b), repost("r-a", "2026-01-02T00:00:00Z", a)],
    );
    expect(items.map(itemId)).toEqual(["r-b", "r-a"]);
  });
});
