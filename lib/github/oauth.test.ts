import { describe, expect, it } from "vitest";
import {
  GITHUB_AUTHORIZE_URL,
  buildAuthorizeUrl,
  consumeOAuthCookie,
  createOAuthCookie,
  githubOAuthError,
  localReturnPath,
} from "./oauth";

describe("localReturnPath", () => {
  it("accepts same-origin paths only", () => {
    expect(localReturnPath("/profile/edit")).toBe("/profile/edit");
    expect(localReturnPath("/profile/projects/new?x=1")).toBe("/profile/projects/new?x=1");
  });

  it("rejects arbitrary return URLs", () => {
    expect(localReturnPath("https://evil.example/phish")).toBe("/profile/projects/new");
    expect(localReturnPath("//evil.example")).toBe("/profile/projects/new");
    expect(localReturnPath("https://github.com")).toBe("/profile/projects/new");
    expect(localReturnPath(null)).toBe("/profile/projects/new");
  });
});

describe("createOAuthCookie / consumeOAuthCookie", () => {
  const key = Buffer.alloc(32, 3);
  const userId = "11111111-1111-4111-8111-111111111111";

  it("binds Samehere user, PKCE verifier, and one-use state", () => {
    const created = createOAuthCookie({
      key,
      keyVersion: 1,
      userId,
      dest: "/profile/edit",
      now: 1_000_000,
    });
    expect(created.cookieOptions.httpOnly).toBe(true);
    expect(created.cookieOptions.sameSite).toBe("lax");
    expect(created.cookieOptions.maxAge).toBe(600);
    expect(created.authorizeUrl.startsWith(GITHUB_AUTHORIZE_URL)).toBe(true);
    expect(created.authorizeUrl).toContain("code_challenge_method=S256");
    expect(created.authorizeUrl).toContain("scope=read%3Auser");

    const consumed = consumeOAuthCookie({
      key,
      packed: created.packed,
      returnedState: created.state,
      sessionUserId: userId,
      now: 1_000_000 + 5_000,
    });
    expect(consumed.ok).toBe(true);
    if (consumed.ok) {
      expect(consumed.userId).toBe(userId);
      expect(consumed.dest).toBe("/profile/edit");
      expect(consumed.verifier.length).toBeGreaterThanOrEqual(43);
    }
  });

  it("rejects state mismatch, account change, and expired cookie", () => {
    const created = createOAuthCookie({
      key,
      keyVersion: 1,
      userId,
      dest: "/profile/edit",
      now: 1_000_000,
    });
    expect(
      consumeOAuthCookie({
        key,
        packed: created.packed,
        returnedState: "other",
        sessionUserId: userId,
        now: 1_000_000,
      }).ok
    ).toBe(false);
    expect(
      consumeOAuthCookie({
        key,
        packed: created.packed,
        returnedState: created.state,
        sessionUserId: "22222222-2222-4222-8222-222222222222",
        now: 1_000_000,
      }).ok
    ).toBe(false);
    expect(
      consumeOAuthCookie({
        key,
        packed: created.packed,
        returnedState: created.state,
        sessionUserId: userId,
        now: 1_000_000 + 601_000,
      }).ok
    ).toBe(false);
  });
});

describe("buildAuthorizeUrl", () => {
  it("targets the official authorize endpoint with PKCE", () => {
    const url = buildAuthorizeUrl({
      clientId: "client",
      redirectUri: "http://localhost:3000/api/integrations/github/callback",
      state: "abc",
      challenge: "challenge",
    });
    expect(url.startsWith("https://github.com/login/oauth/authorize?")).toBe(true);
    expect(url).not.toContain("access_token");
  });
});

describe("githubOAuthError", () => {
  it("maps denied consent and missing fields", () => {
    expect(githubOAuthError({ error: "access_denied" })).toBe("denied");
    expect(githubOAuthError({ state: "x" })).toBe("missing_code");
    expect(githubOAuthError({ code: "c" })).toBe("missing_state");
  });
});
