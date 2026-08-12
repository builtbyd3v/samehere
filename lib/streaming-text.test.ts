import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("landing streaming feedback", () => {
  it("grows the response incrementally without staggered blur animation", () => {
    const root = resolve(import.meta.dirname, "..");
    const component = readFileSync(
      resolve(root, "components/landing/StreamingText.tsx"),
      "utf8",
    );

    expect(component).toContain("requestAnimationFrame");
    expect(component).toContain("landing-stream-toolbar");
    expect(component).toContain("aria-hidden");
    expect(component).not.toContain("WORD_STAGGER");
    expect(component).not.toContain('filter: "blur');
  });
});
