import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PORTFOLIO_RPC_ERRORS } from "@/types/portfolio";

const getUser = vi.fn();
const rpc = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser },
    rpc,
  }),
}));

const { isOwnerJsonApi, updateSession } = await import("./middleware");

function request(path: string, method = "GET", cookies?: Record<string, string>) {
  const headers = new Headers();
  if (cookies) {
    headers.set(
      "cookie",
      Object.entries(cookies)
        .map(([name, value]) => `${name}=${value}`)
        .join("; ")
    );
  }
  return new NextRequest(new URL(path, "http://localhost"), { method, headers });
}

beforeEach(() => {
  getUser.mockReset();
  rpc.mockReset();
  getUser.mockResolvedValue({ data: { user: null } });
  rpc.mockResolvedValue({ data: false });
});

describe("isOwnerJsonApi", () => {
  it("matches portfolio owner APIs and GitHub owner APIs only", () => {
    expect(isOwnerJsonApi("/api/portfolio/analyses")).toBe(true);
    expect(isOwnerJsonApi("/api/portfolio/projects")).toBe(true);
    expect(isOwnerJsonApi("/api/integrations/github/status")).toBe(true);
    expect(isOwnerJsonApi("/api/integrations/github")).toBe(true);
    expect(isOwnerJsonApi("/feed")).toBe(false);
    expect(isOwnerJsonApi("/api/cron/github-sync")).toBe(false);
  });
});

describe("updateSession missing-user owner APIs", () => {
  it("returns 401 JSON for analyses, status, and projects", async () => {
    for (const path of [
      "/api/portfolio/analyses?latest=1",
      "/api/integrations/github/status",
      "/api/portfolio/projects",
    ]) {
      const res = await updateSession(request(path));
      expect(res.status).toBe(401);
      expect(res.headers.get("content-type")).toMatch(/json/);
      expect(await res.json()).toEqual({ error: PORTFOLIO_RPC_ERRORS.notAuthenticated });
    }
  });

  it("lets metrics POST and cron through, and still redirects pages to signup", async () => {
    const metrics = await updateSession(request("/api/portfolio/metrics", "POST"));
    expect(metrics.status).not.toBe(401);
    expect(metrics.status).not.toBe(307);

    const cron = await updateSession(request("/api/cron/github-sync"));
    expect(cron.status).not.toBe(401);
    expect(cron.status).not.toBe(307);

    const oauth = await updateSession(request("/api/integrations/github"));
    expect(oauth.status).not.toBe(401);
    expect(oauth.status).not.toBe(307);

    const page = await updateSession(request("/feed"));
    expect(page.status).toBe(307);
    expect(page.headers.get("location")).toMatch(/\/signup$/);
  });

  it("does not skip the suspension gate for an authenticated owner API", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "owner-1" } } });
    rpc.mockResolvedValue({ data: true });
    const res = await updateSession(
      request("/api/portfolio/analyses?latest=1", "GET", { "sb-test-auth-token": "1" })
    );
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location") ?? "").pathname).toBe("/suspended");
    expect(rpc).toHaveBeenCalled();
  });
});
