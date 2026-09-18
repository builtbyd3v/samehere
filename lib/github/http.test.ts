import { describe, expect, it, vi } from "vitest";
import { GithubHttpError, githubFetch, officialGithubUrl } from "./http";

describe("officialGithubUrl", () => {
  it("allows official API and token endpoints only", () => {
    expect(officialGithubUrl("https://api.github.com/user").hostname).toBe("api.github.com");
    expect(officialGithubUrl("https://github.com/login/oauth/access_token").pathname).toBe(
      "/login/oauth/access_token"
    );
  });

  it("rejects arbitrary hosts, userinfo, and login paths", () => {
    expect(() => officialGithubUrl("https://evil.example/user")).toThrow(GithubHttpError);
    expect(() => officialGithubUrl("https://user:pass@api.github.com/user")).toThrow(GithubHttpError);
    expect(() => officialGithubUrl("https://github.com/login/oauth/authorize")).toThrow(GithubHttpError);
    expect(() => officialGithubUrl("http://api.github.com/user")).toThrow(GithubHttpError);
  });
});

describe("githubFetch", () => {
  it("aborts oversized bodies and off-origin redirects", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response("x".repeat(80), { status: 200 });
    });
    await expect(
      githubFetch("https://api.github.com/user", {
        timeoutMs: 1000,
        maxBytes: 16,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
    ).rejects.toMatchObject({ kind: "oversize" });

    const redirect = vi.fn(async () => {
      return new Response(null, {
        status: 302,
        headers: { location: "https://evil.example/steal" },
      });
    });
    await expect(
      githubFetch("https://api.github.com/user", {
        timeoutMs: 1000,
        maxBytes: 1024,
        fetchImpl: redirect as unknown as typeof fetch,
      })
    ).rejects.toMatchObject({ kind: "redirect" });
  });

  it("never puts a token in the URL", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      expect(url).not.toMatch(/gho_|access_token=/);
      const headers = init?.headers as Record<string, string> | undefined;
      expect(headers?.Authorization ?? headers?.authorization).toMatch(/^Bearer /);
      return new Response("{}", { status: 200 });
    });
    await githubFetch("https://api.github.com/user", {
      timeoutMs: 1000,
      maxBytes: 1024,
      token: "gho_secret",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(fetchImpl).toHaveBeenCalled();
  });
});
