import { describe, expect, it, vi } from "vitest";
import { exchangeAuthorizationCode, fetchGithubIdentity, refreshAccessToken } from "./identity";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("exchangeAuthorizationCode", () => {
  it("posts PKCE verifier to the official token endpoint", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe("https://github.com/login/oauth/access_token");
      expect(String(init?.body)).toContain("code_verifier=verifier-1");
      expect(String(init?.body)).not.toContain("access_token");
      return jsonResponse({
        access_token: "gho_access",
        refresh_token: "ghr_refresh",
        expires_in: 28800,
      });
    });
    const tokens = await exchangeAuthorizationCode({
      clientId: "id",
      clientSecret: "secret",
      code: "code",
      redirectUri: "http://localhost:3000/api/integrations/github/callback",
      verifier: "verifier-1",
      now: 1_700_000_000_000,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(tokens.accessToken).toBe("gho_access");
    expect(tokens.refreshToken).toBe("ghr_refresh");
    expect(tokens.expiresAt).toBe(new Date(1_700_000_000_000 + 28800 * 1000 - 60_000).toISOString());
  });
});

describe("refreshAccessToken", () => {
  it("uses grant_type=refresh_token on the official endpoint", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe("https://github.com/login/oauth/access_token");
      expect(String(init?.body)).toContain("grant_type=refresh_token");
      return jsonResponse({ access_token: "gho_new" });
    });
    const tokens = await refreshAccessToken({
      clientId: "id",
      clientSecret: "secret",
      refreshToken: "ghr_old",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(tokens.accessToken).toBe("gho_new");
    expect(tokens.expiresAt).toBeNull();
  });
});

describe("fetchGithubIdentity", () => {
  it("reads numeric id + login from /user", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ id: 42, login: "ada" }));
    await expect(fetchGithubIdentity("gho_x", fetchImpl as unknown as typeof fetch)).resolves.toEqual({
      id: 42,
      login: "ada",
    });
  });
});
