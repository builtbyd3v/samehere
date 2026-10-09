import { describe, expect, it } from "vitest";
import { OWNER_REFRESH_THROTTLE_MS } from "./config";
import { refreshThrottled } from "./sync";

describe("owner live sync throttle", () => {
  const now = new Date("2026-10-09T12:00:00.000Z");
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

  it("throttles owner refreshes to one per minute", () => {
    expect(OWNER_REFRESH_THROTTLE_MS).toBe(60_000);
    expect(refreshThrottled(ago(30_000), null, now, OWNER_REFRESH_THROTTLE_MS)).toBe(true);
    expect(refreshThrottled(ago(90_000), null, now, OWNER_REFRESH_THROTTLE_MS)).toBe(false);
  });
});
