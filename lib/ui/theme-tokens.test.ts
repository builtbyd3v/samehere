import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Plan 024 guards. (1) Text/background token pairs keep WCAG AA (4.5:1) in
// both themes. (2) No hard-coded white/* overlays in className strings: they
// vanish in the light theme; use --fill-*, --hairline*, --border*, --edge-top.
// ponytail: regex over app/globals.css, not a CSS parser. Values must stay
// hex or rgba() literals or a var() chain to one; reach for a parser if not.

const CSS = readFileSync("app/globals.css", "utf8");

function block(open: string): Map<string, string> {
  const start = CSS.indexOf(open);
  if (start === -1) throw new Error(`no \`${open}\` block in app/globals.css`);
  const body = CSS.slice(start, CSS.indexOf("}", start));
  return new Map([...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}

const ROOT = block(":root {");
const THEMES = {
  dark: new Map([...ROOT, ...block(".dark {")]),
  light: new Map([...ROOT, ...block(".light {")]),
};

type Rgba = [number, number, number, number];

function color(vars: Map<string, string>, token: string): Rgba {
  let value = vars.get(token);
  for (let hops = 0; value?.startsWith("var("); hops++) {
    if (hops > 5) throw new Error(`${token}: var() chain too deep`);
    value = vars.get(value.slice(4, -1).trim());
  }
  if (!value) throw new Error(`${token}: not defined`);
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value)?.[1];
  if (hex) {
    const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
    return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)).concat(1) as Rgba;
  }
  const m = /^rgba?\(([^)]+)\)$/.exec(value);
  if (!m) throw new Error(`${token}: cannot parse ${value}`);
  const [r, g, b, a = 1] = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  return [r, g, b, a];
}

const over = (fg: Rgba, bg: Rgba): Rgba => [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat(1) as Rgba;
const lum = (c: Rgba) =>
  [c[0], c[1], c[2]]
    .map((v) => v / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
function ratio(a: Rgba, b: Rgba): number {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// [text token, background token, chip tint % of the text color (0 = none)]
const PAIRS: [string, string, number][] = [
  ["--ink", "--bg", 0],
  ["--ink-2", "--bg", 0],
  ["--muted", "--bg", 0],
  ["--muted", "--surface-3", 0],
  ["--ink-muted", "--bg", 0],
  ["--faint", "--bg", 0],
  ["--faint", "--surface-3", 0],
  ["--bg", "--ink", 0], // primary button
  ["--on-accent", "--accent", 0], // unread pill
  ["--bg", "--danger", 0], // .btn-danger
  ["--danger", "--bg", 0],
  ["--founder", "--bg", 0],
  ["--campus-founder", "--bg", 0],
  ["--amber", "--bg", 14], // Chip tone amber: 14% tint
  ["--green", "--bg", 12],
  ["--coral", "--bg", 12],
  ["--accent-2", "--bg", 0], // blue text: SameHere count, active nav label
];

describe("theme token contrast (WCAG AA 4.5:1)", () => {
  for (const [theme, vars] of Object.entries(THEMES)) {
    for (const [fg, bg, tint] of PAIRS) {
      it(`${theme}: ${fg} on ${bg}${tint ? ` (${tint}% chip tint)` : ""}`, () => {
        const text = color(vars, fg);
        const base = color(vars, bg);
        const back = tint ? over([text[0], text[1], text[2], tint / 100], base) : base;
        expect(ratio(over(text, back), back)).toBeGreaterThanOrEqual(4.5);
      });
    }
    it(`${theme}: accent chip text (--accent-2 on --accent-soft)`, () => {
      const back = over(color(vars, "--accent-soft"), color(vars, "--bg"));
      expect(ratio(color(vars, "--accent-2"), back)).toBeGreaterThanOrEqual(4.5);
    });
  }

  it("the prefers-color-scheme light block matches .light", () => {
    expect(block(":root:not(.dark) {")).toEqual(block(".light {"));
  });
});

// The landing is forced dark (`dark` class on its <main>), and the portfolio
// avatar ring's white highlight sits on the owner's accent color. Everything
// else themes through tokens.
const WHITE_ALLOW_FILES = /^components\/landing\//;
const WHITE_ALLOW_LINES = /rgba\(255,255,255,0\.4\),color-mix/;

describe("no white/* overlays outside the allowlist", () => {
  it("app and components use theme tokens instead", () => {
    const hits: string[] = [];
    for (const dir of ["app", "components"]) {
      for (const rel of readdirSync(dir, { recursive: true, encoding: "utf8" })) {
        const file = `${dir}/${rel}`;
        if (!/\.tsx?$/.test(file) || /\.test\.tsx?$/.test(file) || WHITE_ALLOW_FILES.test(file)) continue;
        readFileSync(file, "utf8")
          .split("\n")
          .forEach((line, i) => {
            if (WHITE_ALLOW_LINES.test(line)) return;
            if (/\b(?:bg|border|ring|divide|from|via|to|outline|text|fill|stroke|shadow)-white\/|rgba\(255, ?255, ?255/.test(line)) hits.push(`${file}:${i + 1}`);
          });
      }
    }
    expect(hits).toEqual([]);
  });
});
