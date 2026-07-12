import { describe, it, expect } from "vitest";
import { COMPOSER_SYSTEM, IMPROVE_SYSTEM, untrusted } from "./ai-prompts";

describe("untrusted", () => {
  it("wraps plain text in ⟦ ⟧", () => {
    expect(untrusted("hello")).toBe("⟦hello⟧");
  });

  it("strips embedded delimiter chars then wraps", () => {
    expect(untrusted("escape ⟦me⟧ please")).toBe("⟦escape me please⟧");
  });
});

describe("IMPROVE_SYSTEM", () => {
  it("uses the minimal-edit SMALLEST scaffold", () => {
    expect(IMPROVE_SYSTEM).toContain("SMALLEST");
  });

  it("does not inherit STYLE emoji ban so voice can keep emoji", () => {
    expect(IMPROVE_SYSTEM).not.toMatch(/no emoji/i);
  });
});

describe("COMPOSER_SYSTEM", () => {
  it("tells the model not to repeat a recent-post topic", () => {
    expect(COMPOSER_SYSTEM).toContain("do not repeat");
  });
});
