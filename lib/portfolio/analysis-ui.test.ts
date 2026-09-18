import { describe, expect, it } from "vitest";
import {
  ANALYSES_LATEST_PATH,
  analysisPageHref,
  analysisReadFromBody,
  asPickerRepos,
  coverageFacts,
  evidenceViewFromAnalysis,
  filterPublicRepos,
  githubErrorCopy,
  isLiveAnalysisKind,
  messageFromBody,
  parseAnalysisQuery,
  readResponseJson,
  stageRowStates,
} from "./analysis-ui";

describe("parseAnalysisQuery", () => {
  it("accepts a uuid and rejects everything else", () => {
    expect(parseAnalysisQuery("2c0a0b1e-4d3c-4a12-9b8a-1234567890ab")).toBe("2c0a0b1e-4d3c-4a12-9b8a-1234567890ab");
    expect(parseAnalysisQuery("2C0A0B1E-4D3C-4A12-9B8A-1234567890AB")).toBe("2c0a0b1e-4d3c-4a12-9b8a-1234567890ab");
    expect(parseAnalysisQuery("latest")).toBeNull();
    expect(parseAnalysisQuery("not-a-uuid")).toBeNull();
    expect(parseAnalysisQuery(["2c0a0b1e-4d3c-4a12-9b8a-1234567890ab", "other"])).toBe(
      "2c0a0b1e-4d3c-4a12-9b8a-1234567890ab"
    );
    expect(parseAnalysisQuery(undefined)).toBeNull();
  });
});

describe("analysisPageHref", () => {
  it("writes and clears the analysis query without touching other paths", () => {
    expect(analysisPageHref("/profile/projects/new", "2c0a0b1e-4d3c-4a12-9b8a-1234567890ab")).toBe(
      "/profile/projects/new?analysis=2c0a0b1e-4d3c-4a12-9b8a-1234567890ab"
    );
    expect(analysisPageHref("/profile/projects/new?analysis=old&github_error=denied", null)).toBe(
      "/profile/projects/new"
    );
  });
});

describe("filterPublicRepos", () => {
  const repos = [
    { id: 1, name: "bus", fullName: "ada/bus", fork: false },
    { id: 2, name: "notes", fullName: "ada/notes", fork: true },
  ];

  it("filters locally by name or full name and keeps the full list when empty", () => {
    expect(filterPublicRepos(repos, "  BUS ")).toEqual([repos[0]]);
    expect(filterPublicRepos(repos, "ada/")).toEqual(repos);
    expect(filterPublicRepos(repos, "zzz")).toEqual([]);
    expect(filterPublicRepos(repos, "")).toEqual(repos);
  });
});

describe("stageRowStates", () => {
  it("marks persisted live stages without inventing progress", () => {
    const rows = stageRowStates({ kind: "analyzing", status: "analyzing" });
    expect(rows.map((row) => row.state)).toEqual(["done", "done", "active", "pending"]);
    expect(rows.some((row) => row.label.includes("%"))).toBe(false);
  });

  it("completes every row on success and stops at the interrupted status", () => {
    expect(stageRowStates({ kind: "succeeded", status: "succeeded" }).every((row) => row.state === "done")).toBe(true);
    expect(stageRowStates({ kind: "interrupted", status: "reading_repository" }).map((row) => row.state)).toEqual([
      "done",
      "stopped",
      "pending",
      "pending",
    ]);
  });
});

describe("coverageFacts", () => {
  it("prints actual file/byte counts and partial reasons, never a percentage", () => {
    const facts = coverageFacts({
      fullName: "ada/bus",
      commitSha: "abcdef1234567890",
      filesRead: 4,
      fileLimit: 30,
      bytesRead: 1200,
      byteLimit: 204800,
      fork: true,
      partial: true,
      partialReasons: ["token budget"],
      sampledPaths: ["README.md", "package.json"],
    });
    expect(facts).toContain("ada/bus");
    expect(facts).toContain("Sampled 4 files (limit 30)");
    expect(facts).toContain("1200 bytes sampled (limit 204800)");
    expect(facts).toContain("Partial coverage");
    expect(facts).toContain("token budget");
    expect(facts.some((fact) => fact.includes("%"))).toBe(false);
    expect(facts.some((fact) => / of 30 files/.test(fact))).toBe(false);
    expect(facts.some((fact) => fact.startsWith("Sampled:"))).toBe(false);
    expect(coverageFacts(null)).toEqual([]);
  });
});

describe("evidenceViewFromAnalysis", () => {
  it("exposes read-only coverage, evidence, and uncertainty from the persisted row", () => {
    const view = evidenceViewFromAnalysis({
      id: "2c0a0b1e-4d3c-4a12-9b8a-1234567890ab",
      repository_full_name: "ada/bus",
      commit_sha: "abcdef1234567890",
      coverage: { filesRead: 2, fileLimit: 30, sampledPaths: ["README.md"] },
      evidence: [{ path: "README.md", excerpt: "hello" }],
      draft: { uncertaintyNotes: ["Demo URL not proven"], evidence: [] },
    });
    expect(view.analysisId).toBe("2c0a0b1e-4d3c-4a12-9b8a-1234567890ab");
    expect(view.uncertaintyNotes).toEqual(["Demo URL not proven"]);
    expect(view.evidence).toEqual([{ path: "README.md", excerpt: "hello" }]);
    expect(view.coverageFacts.some((fact) => fact.includes("%"))).toBe(false);
  });
});

describe("owner JSON helpers", () => {
  it("reads JSON and surfaces fetch/parse failures without throwing", async () => {
    const ok = await readResponseJson(new Response('{"error":"nope"}', { status: 409 }));
    expect(ok).toEqual({ status: 409, body: { error: "nope" }, parseError: false });
    const bad = await readResponseJson(new Response("<html>", { status: 502 }));
    expect(bad.parseError).toBe(true);
    expect(messageFromBody({ error: "Connect GitHub before analyzing a repository." }, "fallback")).toBe(
      "Connect GitHub before analyzing a repository."
    );
    expect(messageFromBody(null, "Network error. Try again.")).toBe("Network error. Try again.");
  });
});

describe("githubErrorCopy", () => {
  it("maps oauth return codes to owner-safe copy", () => {
    expect(githubErrorCopy("denied")).toMatch(/denied/i);
    expect(githubErrorCopy("unavailable")).toMatch(/manually/i);
    expect(githubErrorCopy(null)).toBeNull();
  });
});

describe("analysisReadFromBody", () => {
  it("reads the latest GET shape and treats missing analysis as empty", () => {
    expect(analysisReadFromBody({ analysis: null, presentation: null, seam: null })).toEqual({
      analysisId: null,
      presentation: null,
      analysis: null,
      editorHref: null,
    });
    expect(
      analysisReadFromBody({
        analysis: { id: "2c0a0b1e-4d3c-4a12-9b8a-1234567890ab" },
        presentation: { kind: "queued", status: "queued" },
        seam: { editorHref: null },
      }).analysisId
    ).toBe("2c0a0b1e-4d3c-4a12-9b8a-1234567890ab");
    expect(asPickerRepos({ repositories: [{ id: 1, name: "bus", fullName: "ada/bus", fork: false }], hasMore: true })).toEqual({
      repositories: [{ id: 1, name: "bus", fullName: "ada/bus", fork: false }],
      hasMore: true,
    });
  });
});

describe("live kinds and latest path", () => {
  it("treats only persisted in-flight stages as live and points at latest=1", () => {
    expect(isLiveAnalysisKind("queued")).toBe(true);
    expect(isLiveAnalysisKind("succeeded")).toBe(false);
    expect(isLiveAnalysisKind("interrupted")).toBe(false);
    expect(ANALYSES_LATEST_PATH).toBe("/api/portfolio/analyses?latest=1");
  });
});
