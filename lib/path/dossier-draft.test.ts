import { describe, expect, it } from "vitest";
import { PATH_PROJECTS } from "./seeds/projects";
import {
  draftDossierFromProject,
  joinExperienceNote,
  matchesProjectExperience,
  PROJECT_EXPERIENCE_KIND,
} from "./dossier-draft";

describe("joinExperienceNote", () => {
  it("joins lines and stops before the cap", () => {
    expect(joinExperienceNote(["alpha", "beta"])).toBe("alpha\nbeta");
    expect(joinExperienceNote(["aaa", "bbb"], 5)).toBe("aaa");
    expect(joinExperienceNote(["  ", "keep"])).toBe("keep");
  });
});

describe("draftDossierFromProject", () => {
  it("builds a project experience from the url-shortener seed", () => {
    const project = PATH_PROJECTS.find((p) => p.slug === "url-shortener");
    expect(project).toBeTruthy();
    const draft = draftDossierFromProject(project!);
    expect(draft.kind).toBe(PROJECT_EXPERIENCE_KIND);
    expect(draft.role).toBe("URL Shortener API");
    expect(draft.org).toBe("Backend & APIs");
    expect(draft.note.length).toBeLessThanOrEqual(600);
    expect(draft.bullets.length).toBeGreaterThan(1);
    expect(draft.note).toContain("POST /shorten");
    expect(draft.note).toContain(project!.interview_roi);
  });

  it("clips overlong titles and notes", () => {
    const draft = draftDossierFromProject({
      title: "T".repeat(120),
      domain: "D".repeat(120),
      what_you_build: ["x".repeat(400), "y".repeat(400)],
      interview_roi: "z".repeat(400),
    });
    expect(draft.role).toHaveLength(80);
    expect(draft.org).toHaveLength(80);
    expect(draft.note.length).toBeLessThanOrEqual(600);
  });
});

describe("matchesProjectExperience", () => {
  it("matches kind+role, not org alone", () => {
    expect(
      matchesProjectExperience(
        { kind: "project", role: "URL Shortener API" },
        "URL Shortener API",
      ),
    ).toBe(true);
    expect(
      matchesProjectExperience({ kind: "job", role: "URL Shortener API" }, "URL Shortener API"),
    ).toBe(false);
    expect(
      matchesProjectExperience({ kind: "project", role: "Habit Tracker" }, "URL Shortener API"),
    ).toBe(false);
  });
});
