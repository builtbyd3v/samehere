import { describe, it, expect } from "vitest";
import {
  CONTEXT_LABELS,
  OPEN_TO_TAGS,
  PORTFOLIO_LIMITS,
  PORTFOLIO_SECTIONS,
  STUDY_MODES,
  contextLabelError,
  httpUrlError,
  openToError,
  studyModeError,
  parseAnalysisDraft,
  portfolioPublishConflict,
  projectWriteError,
  sectionOrderError,
} from "./validation";

describe("httpUrlError", () => {
  it("accepts http and https", () => {
    expect(httpUrlError("Repo", "https://github.com/acme/app")).toBeNull();
    expect(httpUrlError("Demo", "http://localhost:3000/app")).toBeNull();
  });

  it("treats empty as unset", () => {
    expect(httpUrlError("Repo", "")).toBeNull();
    expect(httpUrlError("Repo", null)).toBeNull();
    expect(httpUrlError("Repo", "   ")).toBeNull();
  });

  it("rejects non-http protocols", () => {
    expect(httpUrlError("Repo", "javascript:alert(1)")).toBe(
      "Repo must be an http or https URL."
    );
    expect(httpUrlError("Repo", "data:text/html,hi")).toBe(
      "Repo must be an http or https URL."
    );
    expect(httpUrlError("Repo", "ftp://files.example")).toBe(
      "Repo must be an http or https URL."
    );
  });

  it("rejects malformed hosts and userinfo", () => {
    expect(httpUrlError("Repo", "https://")).toBe("Repo must be an http or https URL.");
    expect(httpUrlError("Repo", "https://user:pass@github.com/acme")).toBe(
      "Repo must not include userinfo."
    );
    expect(httpUrlError("Demo", "https://example.com:notaport/app")).toBe(
      "Demo must be an http or https URL."
    );
  });
});

describe("contextLabelError", () => {
  it("accepts allowlisted labels and unset", () => {
    for (const label of CONTEXT_LABELS) {
      expect(contextLabelError(label)).toBeNull();
    }
    expect(contextLabelError(null)).toBeNull();
    expect(contextLabelError("")).toBeNull();
  });

  it("rejects unknown labels", () => {
    expect(contextLabelError("shipping")).toBe(
      "Context label must be building, learning, or stuck."
    );
  });
});

describe("openToError", () => {
  it("accepts empty and allowlisted unique tags", () => {
    expect(openToError([])).toBeNull();
    expect(openToError([...OPEN_TO_TAGS])).toBeNull();
  });

  it("rejects unknown or duplicate tags", () => {
    expect(openToError(["collaborate", "collaborate"])).toBe(
      "Open-to tags must be unique."
    );
    expect(openToError(["hiring"])).toBe(
      "Open-to tags must be collaborate, study, or feedback."
    );
  });
});

describe("studyModeError", () => {
  it("accepts allowlisted modes and unset", () => {
    for (const mode of STUDY_MODES) {
      expect(studyModeError(mode)).toBeNull();
    }
    expect(studyModeError(null)).toBeNull();
    expect(studyModeError("")).toBeNull();
  });

  it("rejects unknown modes", () => {
    expect(studyModeError("remote")).toBe(
      "Study mode must be on campus, online, hybrid, bootcamp, or self-taught."
    );
  });
});

describe("sectionOrderError", () => {
  it("accepts the default permutation", () => {
    expect(sectionOrderError([...PORTFOLIO_SECTIONS])).toBeNull();
  });

  it("accepts a reordered permutation", () => {
    expect(
      sectionOrderError([
        "projects",
        "intro",
        "activity",
        "posts",
        "education",
        "experience",
      ])
    ).toBeNull();
  });

  it("rejects missing or duplicate sections", () => {
    expect(sectionOrderError(["intro", "projects"])).toBe(
      "Section order must list each portfolio section once."
    );
    expect(
      sectionOrderError([
        "intro",
        "intro",
        "projects",
        "activity",
        "experience",
        "education",
      ])
    ).toBe("Section order must list each portfolio section once.");
  });
});

describe("projectWriteError", () => {
  const valid = {
    title: "Campus bus tracker",
    summary: "Realtime ETAs for campus shuttles.",
    description: "Reads the public GTFS feed and maps stops.",
    personalRole: "Built the parser and map UI.",
    technologies: ["TypeScript", "Next.js"],
    keyFeatures: ["Live map", "Stop search"],
    repoUrl: "https://github.com/acme/bus",
    demoUrl: "https://bus.example.com",
    status: "published" as const,
  };

  it("accepts a published project inside the spec caps", () => {
    expect(projectWriteError(valid)).toBeNull();
  });

  it("rejects over-cap title and missing role on publish", () => {
    expect(projectWriteError({ ...valid, title: "x".repeat(PORTFOLIO_LIMITS.title + 1) })).toBe(
      `Title is capped at ${PORTFOLIO_LIMITS.title} characters.`
    );
    expect(projectWriteError({ ...valid, personalRole: "" })).toBe(
      "Published project requires a personal role."
    );
  });

  it("allows a draft without a role and rejects extra tags", () => {
    expect(
      projectWriteError({
        ...valid,
        status: "draft",
        personalRole: "",
      })
    ).toBeNull();
    expect(
      projectWriteError({
        ...valid,
        technologies: Array.from({ length: PORTFOLIO_LIMITS.technologies + 1 }, (_, i) => `t${i}`),
      })
    ).toBe(`At most ${PORTFOLIO_LIMITS.technologies} technology tags.`);
  });
});

describe("parseAnalysisDraft", () => {
  it("accepts a bounded draft and drops unknown keys", () => {
    const parsed = parseAnalysisDraft({
      title: "Bus tracker",
      summary: "ETA board",
      description: "GTFS parser",
      technologies: ["Go"],
      keyFeatures: ["Map"],
      uncertaintyNotes: ["No deploy proof"],
      evidence: [{ path: "README.md", excerpt: "shuttle" }],
      users: 10000,
    });
    expect(parsed).toEqual({
      ok: true,
      value: {
        title: "Bus tracker",
        summary: "ETA board",
        description: "GTFS parser",
        technologies: ["Go"],
        keyFeatures: ["Map"],
        uncertaintyNotes: ["No deploy proof"],
        evidence: [{ path: "README.md", excerpt: "shuttle" }],
      },
    });
  });

  it("rejects invented metrics and over-cap output", () => {
    expect(parseAnalysisDraft(null)).toEqual({ ok: false, error: "Analysis draft is required." });
    expect(
      parseAnalysisDraft({
        title: "x".repeat(PORTFOLIO_LIMITS.title + 1),
        summary: "",
        description: "",
        technologies: [],
        keyFeatures: [],
        uncertaintyNotes: [],
        evidence: [],
      })
    ).toEqual({
      ok: false,
      error: `Title is capped at ${PORTFOLIO_LIMITS.title} characters.`,
    });
  });
});

describe("portfolioPublishConflict", () => {
  it("flags a private account with any publish switch on", () => {
    expect(
      portfolioPublishConflict(true, {
        publish_intro: false,
        publish_projects: true,
        publish_activity: false,
        publish_experience: false,
        publish_education: false,
        publish_posts: false,
        allow_indexing: false,
      })
    ).toBe(true);
  });

  it("is false when the account is public or every section stays private", () => {
    expect(
      portfolioPublishConflict(false, {
        publish_intro: true,
        publish_projects: true,
        publish_activity: true,
        publish_experience: true,
        publish_education: true,
        publish_posts: true,
        allow_indexing: true,
      })
    ).toBe(false);
    expect(
      portfolioPublishConflict(true, {
        publish_intro: false,
        publish_projects: false,
        publish_activity: false,
        publish_experience: false,
        publish_education: false,
        publish_posts: false,
        allow_indexing: false,
      })
    ).toBe(false);
  });
});
