/**
 * The dark palette, for OG cards.
 *
 * `ImageResponse` renders through Satori, which is not a browser: no DOM, no
 * stylesheet, no cascade, and therefore no CSS custom properties. `var(--canvas)`
 * is an unresolvable string to it, so the OG cards cannot read the design system
 * and the values have to be repeated in TypeScript.
 *
 * That duplication is unavoidable. What is avoidable is having THREE copies of it
 * and no way to notice when they drift. This is the one copy, keyed by the CSS
 * variable it mirrors, and `scripts/check-og-tokens.mjs` (wired to `prebuild`)
 * fails the build if any value here stops matching the `.dark` block in
 * app/globals.css.
 *
 * Change a colour in globals.css and forget this file, and the build tells you.
 */
export const DARK = {
  "--canvas": "#0a0a0a",
  "--surface": "#161616",
  "--surface-post": "#1f2228",
  "--border": "rgba(255, 255, 255, 0.08)",
  "--ink": "#f4f4f5",
  "--ink-muted": "#a1a5ab",
  "--ink-faint": "rgba(245, 245, 245, 0.68)",
  "--featured-surface": "rgba(255, 255, 255, 0.05)",
  "--blue": "#4f9fe8",
  "--blue-2": "#7ec4ff",
  "--accent-blue-soft": "rgba(0, 117, 222, 0.14)",
  "--label-stuck": "#e0a83a",
  "--founder": "#ecc94b",
  "--campus-founder": "#5fce8f",
  "--hm0": "rgba(255, 255, 255, 0.07)",
  "--hm1": "#1e3a5f",
  "--hm2": "#2f6db0",
  "--hm3": "#4f9fe8",
  "--faint": "#787c84",
} as const;

// Readable aliases. The card that draws a raised panel on the canvas uses
// --surface for it, not --surface-card: at 1200x630 the two-step
// canvas -> surface reads better than canvas -> surface-card.
export const CANVAS = DARK["--canvas"];
export const CARD = DARK["--surface"];
export const POST = DARK["--surface-post"];
export const BORDER = DARK["--border"];
export const INK = DARK["--ink"];
export const INK_MUTED = DARK["--ink-muted"];
export const INK_FAINT = DARK["--ink-faint"];
export const FEATURED = DARK["--featured-surface"];
export const BLUE = DARK["--blue"];
export const GOLD = DARK["--founder"];
export const GREEN = DARK["--campus-founder"]; // Social Butterfly
export const HM = [DARK["--hm0"], DARK["--hm1"], DARK["--hm2"], DARK["--hm3"]] as const;
export const BLUE_2 = DARK["--blue-2"];
export const BLUE_SOFT = DARK["--accent-blue-soft"];
export const AMBER = DARK["--label-stuck"];

// Export card ("Midnight editorial") faint label shade.
export const FAINT_LABEL = DARK["--faint"];
