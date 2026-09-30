import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

function Probe() {
  return createElement("span", null, String(usePrefersReducedMotion()));
}

describe("usePrefersReducedMotion", () => {
  it("SSR snapshot is false so first-client markup can match", () => {
    expect(renderToString(createElement(Probe))).toBe("<span>false</span>");
  });
});
