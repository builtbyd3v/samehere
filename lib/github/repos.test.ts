import { describe, expect, it, vi } from "vitest";
import { GithubHttpError } from "./http";
import { canonicalFullName, listPublicReposForIdentity, resolvePublicRepoById } from "./repos";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

describe("canonicalFullName", () => {
  it("accepts GitHub owner/name pairs", () => {
    expect(canonicalFullName("ada/bus")).toEqual({ owner: "ada", name: "bus" });
  });

  it("rejects traversal and junk", () => {
    expect(canonicalFullName("../etc/passwd")).toBeNull();
    expect(canonicalFullName("ada/..")).toBeNull();
    expect(canonicalFullName("ada/bus/extra")).toBeNull();
  });
});

describe("listPublicReposForIdentity", () => {
  it("drops private rows even if GitHub returns them", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      jsonResponse([
        { id: 1, name: "pub", full_name: "ada/pub", private: false, fork: false, default_branch: "main" },
        { id: 2, name: "secret", full_name: "ada/secret", private: true, fork: false, default_branch: "main" },
      ])
    );
    const listed = await listPublicReposForIdentity({
      token: "gho_x",
      page: 1,
      fetchImpl,
    });
    expect(listed.repositories.map((row) => row.id)).toEqual([1]);
    expect(String(fetchImpl.mock.calls[0][0])).toContain("visibility=public");
  });
});

describe("resolvePublicRepoById", () => {
  it("resolves canonical identity + commit from the numeric id", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      if (url.endsWith("/repositories/99")) {
        return jsonResponse({
          id: 99,
          name: "bus",
          full_name: "ada/bus",
          private: false,
          fork: true,
          default_branch: "main",
        });
      }
      if (url.includes("/repos/ada/bus/commits/main")) {
        return jsonResponse({ sha: "a".repeat(40) });
      }
      throw new Error(url);
    });
    const resolved = await resolvePublicRepoById({
      token: "gho_x",
      repositoryId: 99,
      fetchImpl,
    });
    expect(resolved).toEqual({
      id: 99,
      name: "bus",
      fullName: "ada/bus",
      fork: true,
      defaultBranch: "main",
      commitSha: "a".repeat(40),
    });
  });

  it("refuses a repo that is no longer public", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      jsonResponse({ id: 99, name: "bus", full_name: "ada/bus", private: true, default_branch: "main" })
    );
    await expect(
      resolvePublicRepoById({
        token: "gho_x",
        repositoryId: 99,
        fetchImpl,
      })
    ).rejects.toThrow(/not public/);
  });

  it("does not treat caller owner/name as source of truth", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => {
      throw new GithubHttpError("GitHub resource not found.", 404, "not_found");
    });
    await expect(
      resolvePublicRepoById({
        token: "gho_x",
        repositoryId: 40404,
        fetchImpl,
      })
    ).rejects.toMatchObject({ kind: "not_found" });
  });
});
