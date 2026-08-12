import { describe, expect, it } from "vitest";
import {
  dossierSeekingLine,
  experienceKindLabel,
  groupExperiences,
  targetRolesFromAnswers,
} from "./profile-dossier";

describe("groupExperiences", () => {
  it("keeps internships before projects and skips empty groups", () => {
    const groups = groupExperiences([
      { kind: "project", start_date: "2026-03-01", role: "URL Shortener API" },
      { kind: "internship", start_date: "2025-06-01", role: "SWE Intern" },
      { kind: "internship", start_date: "2024-06-01", role: "Older intern" },
    ]);
    expect(groups.map((g) => g.kind)).toEqual(["internship", "project"]);
    expect(groups[0]?.items.map((item) => item.role)).toEqual(["SWE Intern", "Older intern"]);
  });

  it("keeps unknown kinds visible under Other", () => {
    const groups = groupExperiences([{ kind: "volunteer", start_date: null, role: "Tutor" }]);
    expect(groups).toEqual([
      {
        kind: "other",
        label: "Other",
        items: [{ kind: "volunteer", start_date: null, role: "Tutor" }],
      },
    ]);
  });
});

describe("dossierSeekingLine", () => {
  it("prefers intake target roles over goals", () => {
    expect(
      dossierSeekingLine({
        targetRoles: ["Software Engineering Intern", "Backend Intern"],
        goals: "Get any job",
        currentKind: "internship",
        currentRole: "SWE Intern",
        currentOrg: "Google",
        major: "CS",
      }),
    ).toBe("Software Engineering Intern, Backend Intern");
  });

  it("uses the first goals line when intake roles are missing", () => {
    expect(
      dossierSeekingLine({
        goals: "  SWE intern\nAlso exploring PM",
        currentKind: "project",
        currentRole: "URL Shortener API",
        currentOrg: "Backend & APIs",
      }),
    ).toBe("SWE intern");
  });

  it("does not treat a project as the role target", () => {
    expect(
      dossierSeekingLine({
        currentKind: "project",
        currentRole: "URL Shortener API",
        currentOrg: "Backend & APIs",
        major: "Computer Science",
      }),
    ).toBe("Computer Science");
  });

  it("can use a current internship when nothing else is set", () => {
    expect(
      dossierSeekingLine({
        currentKind: "internship",
        currentRole: "SWE Intern",
        currentOrg: "Google",
      }),
    ).toBe("SWE Intern at Google");
  });
});

describe("targetRolesFromAnswers", () => {
  it("reads target_roles without a full intake parse", () => {
    expect(targetRolesFromAnswers({ target_roles: ["SWE Intern", ""] })).toEqual(["SWE Intern"]);
    expect(targetRolesFromAnswers(null)).toEqual([]);
  });
});

describe("experienceKindLabel", () => {
  it("labels known kinds and passes unknown kinds through", () => {
    expect(experienceKindLabel("project")).toBe("Project");
    expect(experienceKindLabel("volunteer")).toBe("volunteer");
  });
});
