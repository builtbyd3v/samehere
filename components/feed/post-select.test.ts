import { describe, expect, it } from "vitest";
import { POST_SELECT } from "./PostCard";

describe("POST_SELECT", () => {
  // posts<->comments has two FKs in prod (post_id, resolved_comment_id); an unhinted embed 300s.
  it("hints the comments embed", () => {
    expect(POST_SELECT).toContain("comments!comments_post_id_fkey(count)");
    expect(POST_SELECT).not.toMatch(/(^|[ ,])comments\(count\)/);
  });
});
