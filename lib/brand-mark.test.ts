import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function pathGeometry(source: string) {
  const path = source.match(
    /<path(?:\s+[^>]*)?\s+d="([^"]+)"(?:\s+[^>]*)?\s+transform="([^"]+)"/,
  );

  if (!path) {
    throw new Error("Brand mark path geometry is missing");
  }

  return { d: path[1], transform: path[2] };
}

describe("samehere brand mark", () => {
  it("keeps the app icon geometry identical to the master SVG", () => {
    const root = resolve(import.meta.dirname, "..");
    const master = readFileSync(resolve(root, "public/samehere-mark.svg"), "utf8");
    const manifestIcon = readFileSync(resolve(root, "public/icon.svg"), "utf8");
    const favicon = readFileSync(resolve(root, "app/icon.svg"), "utf8");

    expect(pathGeometry(manifestIcon)).toEqual(pathGeometry(master));
    expect(pathGeometry(favicon)).toEqual(pathGeometry(master));
  });

  it("keeps the reusable component tied to the master SVG", () => {
    const root = resolve(import.meta.dirname, "..");
    const component = readFileSync(
      resolve(root, "components/SameHereMark.tsx"),
      "utf8",
    );

    expect(component).toContain(
      'href="/samehere-mark.svg#samehere-mark-path"',
    );
  });

  it("morphs the landing wordmark into the mark with an accessible fallback", () => {
    const root = resolve(import.meta.dirname, "..");
    const navBrandPath = resolve(
      root,
      "components/landing/LandingNavBrand.tsx",
    );
    const navBrand = existsSync(navBrandPath)
      ? readFileSync(navBrandPath, "utf8")
      : "";
    const styles = readFileSync(resolve(root, "app/globals.css"), "utf8");

    expect(navBrand).toContain(">same</span>");
    expect(navBrand).toContain(">here</span>");
    expect(navBrand).toContain("<SameHereMark");
    expect(styles).toContain("@keyframes landing-brand-wordmark-out");
    expect(styles).toContain("@keyframes landing-brand-mark-in");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styles).toContain(".landing-brand-link:hover");
    expect(styles).toContain(".landing-nav-brand-wordmark > span:last-child");
    expect(styles).toContain(".landing-nav-brand-link--settled");
    expect(styles).toContain(".brand-slot");
  });

  it("keeps every frame of the landing brand morph crisp", () => {
    const root = resolve(import.meta.dirname, "..");
    const styles = readFileSync(resolve(root, "app/globals.css"), "utf8");
    const wordmarkMotion = styles.slice(
      styles.indexOf("@keyframes landing-brand-wordmark-out"),
      styles.indexOf("@keyframes landing-brand-mark-in"),
    );
    const markMotionStart = styles.indexOf("@keyframes landing-brand-mark-in");
    const markMotion = styles.slice(
      markMotionStart,
      styles.indexOf("@media (prefers-reduced-motion: reduce)", markMotionStart),
    );

    expect(wordmarkMotion).toContain("clip-path:");
    expect(markMotion).toContain("clip-path:");
    expect(wordmarkMotion).not.toContain("blur(");
    expect(wordmarkMotion).not.toContain("scaleX(");
    expect(markMotion).not.toContain("blur(");
    expect(markMotion).not.toContain("scale(");
    expect(wordmarkMotion).toMatch(/74%\s*\{[\s\S]*?opacity:\s*0/);
    expect(markMotion).toMatch(/0%,\s*74%\s*\{[\s\S]*?opacity:\s*0/);
  });
});
