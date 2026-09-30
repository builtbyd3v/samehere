import { describe, expect, it } from "vitest";
import { copyText, parseRef, referralRewardLine, referralStatsFromRpc } from "./referrals";

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

describe("parseRef", () => {
  it("normalizes a valid ref and drops anything else", () => {
    expect(parseRef("Ada_1 ")).toBe("ada_1");
    for (const bad of ["", "ab", "x".repeat(21), "a/b", "ada?x=1", null, ["ada"]]) {
      expect(parseRef(bad)).toBeNull();
    }
  });
});

describe("referralRewardLine", () => {
  it("renders nothing when the progress RPC gave no row", () => {
    expect(referralRewardLine(null)).toBeNull();
    expect(referralRewardLine(undefined)).toBeNull();
  });

  it("shows progress toward the next month and months earned", () => {
    expect(referralRewardLine({ ready: 0, rewards: 0 })).toBe("0 of 3 invited friends have set their stage.");
    const line = referralRewardLine({ ready: 5, rewards: 2 });
    expect(line).toContain("3 of 3");
    expect(line).toContain("Months earned so far: 2.");
  });
});
