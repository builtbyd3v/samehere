import { afterEach, describe, expect, it, vi } from "vitest";
import { loadOwnerAnalytics } from "./metrics-read";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("loadOwnerAnalytics", () => {
  it("locks Free without querying counts", async () => {
    const from = () => {
      throw new Error("should not query");
    };
    await expect(
      loadOwnerAnalytics({ from } as never, "owner-1", false, new Map())
    ).resolves.toEqual({ status: "locked" });
  });

  it("is unavailable when PORTFOLIO_METRICS_SECRET is missing", async () => {
    vi.stubEnv("PORTFOLIO_METRICS_SECRET", "");
    const from = () => {
      throw new Error("should not query");
    };
    await expect(
      loadOwnerAnalytics({ from } as never, "owner-1", true, new Map())
    ).resolves.toEqual({ status: "unavailable" });
  });

  it("is empty when the secret is set and there are no counts", async () => {
    vi.stubEnv("PORTFOLIO_METRICS_SECRET", "metrics-test-secret");
    const from = () => ({
      select() {
        return this;
      },
      eq() {
        return this;
      },
      gte() {
        return this;
      },
      returns() {
        return Promise.resolve({ data: [], error: null });
      },
    });
    await expect(
      loadOwnerAnalytics({ from } as never, "owner-1", true, new Map())
    ).resolves.toEqual({ status: "empty" });
  });
});
