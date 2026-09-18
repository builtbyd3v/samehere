import { describe, expect, it } from "vitest";
import type { PortfolioProject, PublicPortfolioProjection } from "@/types/portfolio";
import {
  assertNoDraftLeak,
  metadataDescription,
  orderedSections,
  ownerPreviewProjects,
  profileIntro,
  publicIntro,
  publicSectionVisible,
  robotsForProjection,
} from "./projection";
import { PORTFOLIO_SECTIONS } from "./validation";

const published: PublicPortfolioProjection = {
  owner_id: "o1",
  username: "ada",
  is_private: false,
  allow_indexing: true,
  publish_intro: true,
  publish_projects: true,
  publish_activity: true,
  publish_experience: false,
  publish_education: false,
  publish_posts: false,
  activity_visible: true,
  section_order: ["intro", "projects", "activity", "experience", "education", "posts"],
};

describe("robotsForProjection", () => {
  it("indexes only the published allow_indexing projection", () => {
    expect(robotsForProjection(published, false)).toEqual({ index: true, follow: true });
    expect(robotsForProjection({ ...published, allow_indexing: false }, false)).toEqual({
      index: false,
      follow: false,
    });
    expect(robotsForProjection(published, true)).toEqual({ index: false, follow: false });
    expect(robotsForProjection(null, false)).toEqual({ index: false, follow: false });
  });
});

describe("publicSectionVisible", () => {
  it("keeps unpublished and private sections off the public page", () => {
    expect(publicSectionVisible(published, "intro")).toBe(true);
    expect(publicSectionVisible(published, "experience")).toBe(false);
    expect(publicSectionVisible(published, "posts")).toBe(false);
    expect(publicSectionVisible({ ...published, is_private: true, publish_intro: true }, "intro")).toBe(
      false
    );
    expect(
      publicSectionVisible({ ...published, is_private: true, publish_posts: true }, "posts")
    ).toBe(false);
  });

  it("uses activity_visible, not GitHub presence, for the activity section", () => {
    expect(publicSectionVisible({ ...published, activity_visible: false, publish_activity: true }, "activity")).toBe(
      false
    );
    expect(publicSectionVisible({ ...published, activity_visible: true, publish_activity: false }, "activity")).toBe(
      true
    );
  });
});

describe("orderedSections", () => {
  const reordered = ["projects", "intro", "activity", "posts", "education", "experience"] as const;

  it("keeps a validated custom order", () => {
    expect(orderedSections(reordered)).toEqual([...reordered]);
    expect(orderedSections(reordered)).not.toEqual([...PORTFOLIO_SECTIONS]);
  });

  it("falls back to canonical order on duplicates, missing, or unknown entries", () => {
    expect(
      orderedSections(["intro", "intro", "projects", "activity", "experience", "education"])
    ).toEqual([...PORTFOLIO_SECTIONS]);
    expect(orderedSections(["projects", "activity"])).toEqual([...PORTFOLIO_SECTIONS]);
    expect(
      orderedSections(["intro", "projects", "activity", "experience", "education", "jobs"])
    ).toEqual([...PORTFOLIO_SECTIONS]);
  });
});

describe("publicIntro + draft leak", () => {
  it("hides bio when intro is unpublished and never lists draft titles", () => {
    expect(
      publicIntro(
        {
          id: "o1",
          username: "ada",
          display_name: "Ada",
          bio: "secret bio",
          goals: "secret goals",
          open_to: ["collaborate"],
          is_private: false,
        },
        { ...published, publish_intro: false }
      )
    ).toEqual({ bio: null, goals: null, open_to: [] });
    const draft: PortfolioProject = {
      id: "p1",
      owner_id: "o1",
      title: "Hidden draft",
      summary: null,
      description: null,
      personalRole: null,
      technologies: [],
      keyFeatures: [],
      repoUrl: null,
      demoUrl: null,
      status: "draft",
      sort_order: 0,
      published_at: null,
      source_repository_id: null,
      source_commit_sha: null,
      source_analysis_id: null,
      created_at: "2026-09-10T00:00:00.000Z",
      updated_at: "2026-09-10T00:00:00.000Z",
    };
    expect(assertNoDraftLeak([draft])).toEqual(["Hidden draft"]);
    expect(ownerPreviewProjects([draft])).toEqual([]);
    expect(metadataDescription("ada")).not.toContain("secret");
  });

  it("keeps owner bio on a private account and still gates public preview", () => {
    const identity = {
      id: "o1",
      username: "ada",
      display_name: "Ada",
      bio: "secret bio",
      goals: "secret goals",
      open_to: ["collaborate"] as string[],
      is_private: true,
    };
    const privatePublished = { ...published, is_private: true, publish_intro: true };
    expect(profileIntro(identity, privatePublished, "owner")).toEqual({
      bio: "secret bio",
      goals: "secret goals",
      open_to: ["collaborate"],
    });
    expect(profileIntro(identity, privatePublished, "public")).toEqual({
      bio: null,
      goals: null,
      open_to: [],
    });
    expect(publicIntro(identity, privatePublished)).toEqual({ bio: null, goals: null, open_to: [] });
  });
});
