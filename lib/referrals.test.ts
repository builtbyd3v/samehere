import { describe, expect, it } from "vitest";
import { copyText, parseRef, referralStatsFromRpc } from "./referrals";

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
