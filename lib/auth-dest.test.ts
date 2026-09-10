import { describe, it, expect } from "vitest";
import { authSuccessDest } from "./auth-dest";

describe("authSuccessDest", () => {
  it("defaults confirmation and OAuth to /feed", () => {
    expect(authSuccessDest(null)).toBe("/feed");
    expect(authSuccessDest("")).toBe("/feed");
    expect(authSuccessDest("feed")).toBe("/feed");
  });

  it("keeps same-origin recovery next", () => {
    expect(authSuccessDest("/update-password")).toBe("/update-password");
  });

  it("rejects protocol-relative and off-origin values", () => {
    expect(authSuccessDest("//evil.test")).toBe("/feed");
    expect(authSuccessDest("https://evil.test")).toBe("/feed");
  });
});
