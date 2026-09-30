import { describe, expect, it } from "vitest";
import { SKILLS_CAP, deriveSkills } from "./skills";

describe("deriveSkills", () => {
  it("returns nothing for no projects", () => {
    expect(deriveSkills([])).toEqual([]);
  });

  it("dedupes case-insensitively, keeps the first spelling, counts once per project", () => {
    expect(deriveSkills([{ technologies: ["React", "react", "REACT"] }])).toEqual(["React"]);
  });

  it("orders by number of projects using the skill", () => {
    expect(
      deriveSkills([
        { technologies: ["Go"] },
        { technologies: ["TypeScript", "Go"] },
        { technologies: ["typescript", "Go"] },
      ])
    ).toEqual(["Go", "TypeScript"]);
  });

  it("breaks ties by first appearance", () => {
    expect(deriveSkills([{ technologies: ["Rust", "Python"] }, { technologies: ["Python", "Rust"] }])).toEqual([
      "Rust",
      "Python",
    ]);
  });

  it("ignores blank entries and trims labels", () => {
    expect(deriveSkills([{ technologies: [" Next.js ", "", "  "] }])).toEqual(["Next.js"]);
  });

  it("caps at SKILLS_CAP by default", () => {
    const technologies = Array.from({ length: 15 }, (_, i) => `Tech${i}`);
    const skills = deriveSkills([{ technologies }]);
    expect(skills).toHaveLength(SKILLS_CAP);
    expect(skills).toEqual(technologies.slice(0, 12));
  });

  it("honors a custom cap", () => {
    expect(deriveSkills([{ technologies: ["A", "B", "C", "D"] }], 2)).toHaveLength(2);
  });
});
