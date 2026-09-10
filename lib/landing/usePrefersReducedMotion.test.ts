import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Hero from "@/components/landing/Hero";
import PortfolioDemo from "@/components/landing/PortfolioDemo";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

function Probe() {
  return createElement("span", null, String(usePrefersReducedMotion()));
}

describe("usePrefersReducedMotion", () => {
  it("SSR snapshot is false so first-client markup can match", () => {
    expect(renderToString(createElement(Probe))).toBe("<span>false</span>");
  });

  it("SSR Hero is the social scene, not the GitHub workbench", () => {
    const html = renderToString(createElement(Hero));
    expect(html).toContain("Find");
    expect(html).toContain("people");
    expect(html).toContain("building.");
    expect(html).toContain("you’re");
    expect(html).toContain("For students, building together");
    expect(html).toContain("Maya Chen");
    expect(html).toContain(">MC<");
    expect(html).toContain("Campus course planner");
    expect(html).toContain("Priya Shah");
    expect(html).toContain("Example");
    expect(html).not.toContain("Turn a public GitHub repo into an editable project");
    expect(html).not.toMatch(/landing-workbench/);
  });

  it("SSR PortfolioDemo meta is Queued, not Draft ready", () => {
    const html = renderToString(createElement(PortfolioDemo));
    expect(html).toMatch(/landing-demo-meta">Queued</);
    expect(html).not.toMatch(/landing-demo-meta">Draft ready</);
    expect(html).toContain("Your project write-up appears here when the draft is ready.");
    expect(html).not.toContain("Campus course planner");
  });
});
