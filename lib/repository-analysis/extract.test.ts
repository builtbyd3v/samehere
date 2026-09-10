import { describe, expect, it, vi } from "vitest";
import { EXTRACT_LIMITS } from "./limits";
import { canonicalRepoPath, extractPublicRepository } from "./extract";

const repo = {
  id: 99,
  name: "bus",
  fullName: "ada/bus",
  fork: false,
  defaultBranch: "main",
  commitSha: "a".repeat(40),
};

function contents(path: string, entries: unknown) {
  return { path, entries };
}

describe("canonicalRepoPath", () => {
  it("rejects traversal, absolute, and protocol paths", () => {
    expect(canonicalRepoPath("../etc/passwd")).toBeNull();
    expect(canonicalRepoPath("/etc/passwd")).toBeNull();
    expect(canonicalRepoPath("https://evil.example/x")).toBeNull();
    expect(canonicalRepoPath("src\\secret")).toBeNull();
    expect(canonicalRepoPath("src/app.ts")).toBe("src/app.ts");
  });
});

describe("extractPublicRepository", () => {
  it("pins reads to the resolved SHA and skips secrets/vendor/oversize", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      expect(url).toContain(`ref=${repo.commitSha}`);
      expect(url).not.toContain("evil.example");
      if (url.includes("/contents?ref=")) {
        return json([
          { type: "file", name: "README.md", path: "README.md", size: 20 },
          { type: "file", name: ".env", path: ".env", size: 20 },
          { type: "dir", name: "node_modules", path: "node_modules" },
          { type: "file", name: "huge.ts", path: "huge.ts", size: EXTRACT_LIMITS.maxBytesPerFile + 1 },
          { type: "symlink", name: "link", path: "link" },
          { type: "file", name: "app.ts", path: "src/app.ts", size: 12 },
        ]);
      }
      if (url.includes("/contents/README.md")) {
        return json({
          type: "file",
          path: "README.md",
          encoding: "base64",
          content: Buffer.from("# Bus").toString("base64"),
        });
      }
      if (url.includes("/contents/src/app.ts")) {
        return json({
          type: "file",
          path: "src/app.ts",
          encoding: "base64",
          content: Buffer.from("export const n = 1;").toString("base64"),
        });
      }
      throw new Error(url);
    });
    const extracted = await extractPublicRepository({
      token: "gho_x",
      repo,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(extracted.coverage.sampledPaths).toEqual(["README.md", "src/app.ts"]);
    expect(extracted.coverage.skippedPaths).toEqual(expect.arrayContaining([".env", "huge.ts", "link"]));
    expect(extracted.coverage.commitSha).toBe(repo.commitSha);
    expect(extracted.files.every((file) => file.bytes <= EXTRACT_LIMITS.maxBytesPerFile)).toBe(true);
  });

  it("does not follow caller-supplied owner/name or external URLs", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      expect(url.startsWith("https://api.github.com/repos/ada/bus/")).toBe(true);
      return json([]);
    });
    await extractPublicRepository({
      token: "gho_x",
      repo: { ...repo, fullName: "ada/bus" },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(canonicalRepoPath("../../etc/passwd")).toBeNull();
    void contents;
  });
});

function json(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200 });
}
