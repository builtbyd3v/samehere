import { describe, expect, it } from "vitest";
import { copyText, referralStatsFromRpc } from "./referrals";

describe("copyText", () => {
  it("waits for the clipboard and reports failure", async () => {
    expect(await copyText("https://x/signup?ref=ada", { writeText: async () => undefined })).toBe(true);
    expect(
      await copyText("https://x/signup?ref=ada", {
        writeText: async () => {
          throw new Error("denied");
        },
      })
    ).toBe(false);
  });
});

describe("referralStatsFromRpc", () => {
  it("returns unavailable instead of fabricating a code or zero progress", () => {
    expect(referralStatsFromRpc(null, new Error("boom"), "user-12345678")).toEqual({
      status: "unavailable",
    });
    expect(referralStatsFromRpc([], null, "user-12345678")).toEqual({ status: "unavailable" });
  });

  it("passes through server-returned qualified, pending, and reward state", () => {
    expect(
      referralStatsFromRpc(
        [{ code: "ada", referral_count: 12, pending_count: 3, is_campus_founder: false }],
        null,
        "user-12345678"
      )
    ).toEqual({
      status: "ok",
      code: "ada",
      referralCount: 12,
      pendingCount: 3,
      isCampusFounder: false,
    });
  });
});
