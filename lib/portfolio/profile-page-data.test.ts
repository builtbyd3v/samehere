import { describe, expect, it } from "vitest";
import type { PublicPortfolioEducation, PublicPortfolioExperience, PublicPortfolioProjection } from "@/types/portfolio";
import {
  canCiteExpEdu,
  currentExpEduTagline,
  resolveShowPosts,
  resumeFields,
  schoolMajorLine,
} from "./profile-page-data";

const projection: PublicPortfolioProjection = {
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

const exp = (over: Partial<PublicPortfolioExperience>): PublicPortfolioExperience => ({
  id: "e1",
  kind: "internship",
  org: "Org",
  role: "Role",
  term: null,
  note: null,
  start_date: "2026-01-01",
  end_date: null,
  is_current: true,
  ...over,
});

const edu = (over: Partial<PublicPortfolioEducation>): PublicPortfolioEducation => ({
  id: "d1",
  school: "School",
  degree: "B.S.",
  field: "Field",
  class_year: null,
  start_date: "2025-09-01",
  end_date: null,
  is_current: true,
  ...over,
});

describe("schoolMajorLine", () => {
  it("joins what is there", () => {
    expect(schoolMajorLine(null, null)).toBeNull();
    expect(schoolMajorLine("School", null)).toBe("School");
    expect(schoolMajorLine(null, "Major")).toBe("Major");
    expect(schoolMajorLine("School", "Major")).toBe("School · Major");
  });
});

describe("currentExpEduTagline", () => {
  it("cites the current role and study", () => {
    expect(currentExpEduTagline([exp({})], [edu({})])).toBe("Role at Org · Field at School");
  });
  it("is empty without current rows", () => {
    expect(currentExpEduTagline([exp({ is_current: false })], [edu({ is_current: false })])).toBe("");
  });
  it("falls back to the degree when there is no field", () => {
    expect(currentExpEduTagline([], [edu({ field: null })])).toBe("B.S. at School");
  });
});

describe("canCiteExpEdu", () => {
  const base = { contentHidden: false, isOwner: false, previewPublic: false, projection };
  it("follows ownership, visibility and publish flags", () => {
    expect(canCiteExpEdu({ ...base, isOwner: true, projection: null })).toBe(true);
    expect(canCiteExpEdu({ ...base, isOwner: true, contentHidden: true })).toBe(false);
    expect(canCiteExpEdu({ ...base, projection: { ...projection, publish_education: true } })).toBe(true);
    expect(canCiteExpEdu({ ...base, projection: { ...projection, publish_education: true, is_private: true } })).toBe(false);
    expect(canCiteExpEdu({ ...base, projection: null })).toBe(false);
  });
});

describe("resumeFields", () => {
  const profile = {
    is_private: false,
    headline: "Builder",
    github_url: "https://github.com/ada",
    linkedin_url: null,
    website_url: "https://ada.dev",
  };
  const base = { profile, contentHidden: false, isOwner: false, previewPublic: false };
  it("hides resume fields when content is hidden", () => {
    expect(resumeFields({ ...base, contentHidden: true })).toBeNull();
  });
  it("hides them in the owner's public preview of a private account", () => {
    expect(resumeFields({ ...base, profile: { ...profile, is_private: true }, isOwner: true, previewPublic: true })).toBeNull();
  });
  it("returns the fields for a public viewer", () => {
    expect(resumeFields(base)).toEqual({
      headline: "Builder",
      github: "https://github.com/ada",
      linkedin: null,
      website: "https://ada.dev",
    });
  });
  it("is null for the fallback select without resume columns", () => {
    expect(resumeFields({ ...base, profile: { is_private: false } })).toBeNull();
  });
});

describe("resolveShowPosts", () => {
  const base = {
    isOwner: false,
    previewPublic: false,
    isPrivate: false,
    isAcceptedFollower: false,
    isBlocked: false,
    portfolioUnavailable: false,
    projection,
    bundleOk: true,
  };
  it("gates posts like the page always did", () => {
    expect(resolveShowPosts({ ...base, isOwner: true })).toBe(true);
    expect(resolveShowPosts(base)).toBe(false);
    expect(resolveShowPosts({ ...base, isPrivate: true, isAcceptedFollower: true })).toBe(true);
    expect(resolveShowPosts({ ...base, projection: { ...projection, publish_posts: true }, isBlocked: true })).toBe(false);
  });
});
