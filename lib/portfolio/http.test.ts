import { describe, expect, it } from "vitest";
import { profileSharePath, profileShareUrl } from "./share";
import { robotsForProjection } from "./projection";
import { parseProjectWrite, parsePublishFlags } from "./owner";

describe("owner/public API contracts", () => {
  it("canonical share link is /profile/[username]", () => {
    expect(profileSharePath("ada")).toBe("/profile/ada");
    expect(profileShareUrl("ada")).toContain("/profile/ada");
  });

  it("rejects publish-shaped writes without a personal role", () => {
    const parsed = parseProjectWrite({
      title: "Bus",
      summary: null,
      description: null,
      personalRole: "",
      technologies: [],
      keyFeatures: [],
      repoUrl: null,
      demoUrl: null,
      status: "published",
    });
    expect(parsed.ok).toBe(false);
    if (!parsed.ok && !parsed.unavailable) {
      expect(parsed.error).toBe("Published project requires a personal role.");
      expect(parsed.status).toBe(400);
    }
  });

  it("keeps unpublished flags off by default in parsed settings", () => {
    const parsed = parsePublishFlags({});
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.publish_intro).toBe(false);
      expect(parsed.data.publish_projects).toBe(false);
      expect(parsed.data.allow_indexing).toBe(false);
    }
  });

  it("metadata robots follow allow_indexing only", () => {
    expect(
      robotsForProjection(
        {
          owner_id: "o",
          username: "ada",
          is_private: false,
          allow_indexing: true,
          publish_intro: true,
          publish_projects: true,
          publish_activity: false,
          publish_experience: false,
          publish_education: false,
          publish_posts: false,
          activity_visible: false,
          section_order: ["intro", "projects", "activity", "experience", "education", "posts"],
        },
        false
      )
    ).toEqual({ index: true, follow: true });
  });
});
