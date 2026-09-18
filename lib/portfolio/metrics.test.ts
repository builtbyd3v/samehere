import { afterEach, describe, expect, it } from "vitest";
import { PORTFOLIO_SECTIONS } from "./validation";
import {
  effectiveSectionOrder,
  eligiblePublicView,
  isBotUserAgent,
  METRICS_SESSION_COOKIE,
  abuseRateKey,
  hasRenderedPublicContent,
  parseMetricBody,
  privacyOptOut,
  readCappedJson,
  readMetricSessionCookie,
  resetMetricRateLimitForTests,
  resolveClickUrl,
  sameOriginRequest,
  sessionHash,
  signMetricSession,
  summarizeMetrics,
  takeMetricRateSlot,
  trustedClientIp,
  verifyMetricSession,
} from "./metrics";

afterEach(() => {
  resetMetricRateLimitForTests();
});

describe("parseMetricBody", () => {
  it("accepts a public username view or a project click kind", () => {
    expect(parseMetricBody({ username: "ada" })).toEqual({ kind: "view", username: "ada" });
    expect(parseMetricBody({ projectId: "11111111-1111-4111-8111-111111111111", clickKind: "repo" })).toEqual({
      kind: "click",
      projectId: "11111111-1111-4111-8111-111111111111",
      clickKind: "repo",
    });
    const demo = parseMetricBody({ projectId: "11111111-1111-4111-8111-111111111111", clickKind: "demo" });
    expect(demo).toEqual({
      kind: "click",
      projectId: "11111111-1111-4111-8111-111111111111",
      clickKind: "demo",
    });
  });

  it("rejects viewer ids, URLs, and oversized input", () => {
    expect(parseMetricBody({ username: "ada", viewerId: "x" })).toBeNull();
    expect(parseMetricBody({ username: "ada", href: "https://evil.test" })).toBeNull();
    expect(parseMetricBody({ projectId: "11111111-1111-4111-8111-111111111111", clickKind: "repo", url: "https://x" })).toBeNull();
    expect(parseMetricBody({ username: "a".repeat(40) })).toBeNull();
    expect(parseMetricBody({ projectId: "not-a-uuid", clickKind: "repo" })).toBeNull();
    expect(parseMetricBody(null)).toBeNull();
  });
});

describe("sameOriginRequest", () => {
  it("requires a matching Origin or Referer host", () => {
    const url = "https://www.samehere.dev/api/portfolio/metrics";
    expect(
      sameOriginRequest(new Request(url, { headers: { origin: "https://www.samehere.dev" } }), "www.samehere.dev")
    ).toBe(true);
    expect(
      sameOriginRequest(new Request(url, { headers: { referer: "https://www.samehere.dev/profile/ada" } }), "www.samehere.dev")
    ).toBe(true);
    expect(
      sameOriginRequest(new Request(url, { headers: { origin: "https://evil.test" } }), "www.samehere.dev")
    ).toBe(false);
    expect(sameOriginRequest(new Request(url), "www.samehere.dev")).toBe(false);
  });
});

describe("privacy + bots", () => {
  it("honors GPC, DNT, and PostHog opt-out cookies", () => {
    expect(privacyOptOut({ "sec-gpc": "1" }, "")).toBe(true);
    expect(privacyOptOut({ dnt: "1" }, "")).toBe(true);
    expect(privacyOptOut({}, "ph_optout=1; other=1")).toBe(true);
    expect(privacyOptOut({}, "")).toBe(false);
  });

  it("detects common crawler user agents", () => {
    expect(isBotUserAgent("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
    expect(isBotUserAgent("Mozilla/5.0 (Macintosh) Chrome/120")).toBe(false);
  });
});

describe("metric session", () => {
  it("signs, verifies, and hashes a session id", () => {
    const token = signMetricSession("sess-1", 1_800_000_000, "secret");
    expect(verifyMetricSession(token, "secret", 1_700_000_000)).toEqual({ id: "sess-1", exp: 1_800_000_000 });
    expect(verifyMetricSession(token, "wrong", 1_700_000_000)).toBeNull();
    expect(verifyMetricSession(token, "secret", 1_800_000_001)).toBeNull();
    expect(sessionHash("sess-1")).toMatch(/^[0-9a-f]{64}$/);
    expect(sessionHash("sess-1")).not.toBe("sess-1");
  });
});

describe("rate limit", () => {
  it("is bounded in memory and best-effort per process", () => {
    expect(takeMetricRateSlot("abc", 1_700_000_000)).toBe(true);
    for (let i = 0; i < 40; i += 1) takeMetricRateSlot("abc", 1_700_000_000);
    expect(takeMetricRateSlot("abc", 1_700_000_000)).toBe(false);
    expect(takeMetricRateSlot("def", 1_700_000_000)).toBe(true);
  });

  it("buckets abuse by HMAC of IP + window, never the raw IP", () => {
    const key = abuseRateKey("secret", "203.0.113.9", 1_700_000_000);
    expect(key.startsWith("abuse:")).toBe(true);
    expect(key).not.toContain("203.0.113.9");
    expect(abuseRateKey("secret", "203.0.113.9", 1_700_000_000)).toBe(key);
    expect(abuseRateKey("secret", "198.51.100.2", 1_700_000_000)).not.toBe(key);
    expect(trustedClientIp(new Headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" }))).toBe("203.0.113.9");
  });
});

describe("request bounds", () => {
  it("does not throw on a malformed percent-encoded session cookie", () => {
    expect(readMetricSessionCookie(`${METRICS_SESSION_COOKIE}=%E0%A4%A`)).toBeUndefined();
    expect(readMetricSessionCookie(`${METRICS_SESSION_COOKIE}=ok.token`)).toBe("ok.token");
  });

  it("rejects an oversized metrics body before JSON parse", async () => {
    const huge = "x".repeat(2000);
    const res = await readCappedJson(
      new Request("http://localhost/api/portfolio/metrics", {
        method: "POST",
        headers: { "content-type": "application/json", "content-length": "2000" },
        body: JSON.stringify({ username: huge }),
      })
    );
    expect(res).toBeUndefined();
    expect(await readCappedJson(new Request("http://localhost/x", { method: "POST", body: '{"username":"ada"}' }))).toEqual({
      username: "ada",
    });
  });

  it("cancels a chunked body once the cap is crossed and swallows read failures", async () => {
    const encoder = new TextEncoder();
    const oversized = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode("{\"username\":\""));
        controller.enqueue(encoder.encode("x".repeat(2000)));
        controller.enqueue(encoder.encode("\"}"));
        controller.close();
      },
    });
    expect(
      await readCappedJson(
        new Request("http://localhost/x", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: oversized,
          duplex: "half",
        } as RequestInit)
      )
    ).toBeUndefined();

    const failing = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.error(new Error("read failed"));
      },
    });
    expect(
      await readCappedJson(
        new Request("http://localhost/x", {
          method: "POST",
          body: failing,
          duplex: "half",
        } as RequestInit)
      )
    ).toBeUndefined();
  });
});

describe("hasRenderedPublicContent", () => {
  it("uses activity_visible, not publish_activity, for the activity section", () => {
    expect(hasRenderedPublicContent({ publish_activity: true, activity_visible: false })).toBe(false);
    expect(hasRenderedPublicContent({ publish_activity: false, activity_visible: true })).toBe(true);
    expect(hasRenderedPublicContent({ publish_intro: true, activity_visible: false })).toBe(true);
  });
});

describe("resolveClickUrl", () => {
  it("returns only the stored published http(s) destination", () => {
    expect(
      resolveClickUrl({ repo_url: "https://github.com/acme/bus", demo_url: "https://bus.example" }, "repo")
    ).toBe("https://github.com/acme/bus");
    expect(resolveClickUrl({ repo_url: "javascript:alert(1)", demo_url: "https://ok.test" }, "repo")).toBeNull();
    expect(resolveClickUrl({ repo_url: "https://ok.test", demo_url: null }, "demo")).toBeNull();
  });
});

describe("eligiblePublicView", () => {
  it("ignores owner, preview, private, blocked, and unpublished pages", () => {
    expect(
      eligiblePublicView({
        isOwner: false,
        previewPublic: false,
        isPrivate: false,
        isBlocked: false,
        isSuspended: false,
        hasRenderedPublicContent: true,
      })
    ).toBe(true);
    expect(
      eligiblePublicView({
        isOwner: true,
        previewPublic: false,
        isPrivate: false,
        isBlocked: false,
        isSuspended: false,
        hasRenderedPublicContent: true,
      })
    ).toBe(false);
    expect(
      eligiblePublicView({
        isOwner: true,
        previewPublic: true,
        isPrivate: false,
        isBlocked: false,
        isSuspended: false,
        hasRenderedPublicContent: true,
      })
    ).toBe(false);
    expect(
      eligiblePublicView({
        isOwner: false,
        previewPublic: false,
        isPrivate: true,
        isBlocked: false,
        isSuspended: false,
        hasRenderedPublicContent: true,
      })
    ).toBe(false);
    expect(
      eligiblePublicView({
        isOwner: false,
        previewPublic: false,
        isPrivate: false,
        isBlocked: false,
        isSuspended: false,
        hasRenderedPublicContent: false,
      })
    ).toBe(false);
  });
});

describe("effectiveSectionOrder", () => {
  it("keeps a saved custom order only while current Pro", () => {
    const custom = ["projects", "intro", "activity", "posts", "education", "experience"] as const;
    expect(effectiveSectionOrder(custom, true)).toEqual([...custom]);
    expect(effectiveSectionOrder(custom, false)).toEqual([...PORTFOLIO_SECTIONS]);
  });
});

describe("summarizeMetrics", () => {
  it("labels 30-day views and link clicks, not people", () => {
    const summary = summarizeMetrics([
      { owner_id: "o", project_id: null, metric_date: "2026-09-01", view_count: 4, click_count: 0 },
      { owner_id: "o", project_id: "p1", metric_date: "2026-09-01", view_count: 0, click_count: 2 },
      { owner_id: "o", project_id: "p1", metric_date: "2026-09-02", view_count: 0, click_count: 1 },
      { owner_id: "o", project_id: "p2", metric_date: "2026-09-01", view_count: 0, click_count: 5 },
    ]);
    expect(summary).toEqual({
      views: 4,
      linkClicks: 8,
      perProject: [
        { projectId: "p2", clicks: 5 },
        { projectId: "p1", clicks: 3 },
      ],
    });
  });
});
