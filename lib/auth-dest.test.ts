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

  it("rejects backslash and control-character escapes", () => {
    expect(authSuccessDest("/\\evil.test")).toBe("/feed");
    expect(authSuccessDest("/\t/evil.test")).toBe("/feed");
    expect(authSuccessDest("/\n/evil.test")).toBe("/feed");
  });

  it("keeps encoded backslash as a same-origin path", () => {
    expect(authSuccessDest("/%5Cevil.test")).toBe("/%5Cevil.test");
  });

  it("preserves query and hash", () => {
    expect(authSuccessDest("/profile/edit?x=1#y")).toBe("/profile/edit?x=1#y");
  });
});
