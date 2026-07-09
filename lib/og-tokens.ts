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
  "--canvas": "#141310",
  "--surface": "#1c1a16",
  "--surface-post": "#232018",
  "--border": "rgba(247, 244, 237, 0.10)",
  "--ink": "#f2efe6",
  "--ink-muted": "#a8a49a",
  "--ink-faint": "rgba(242, 239, 230, 0.40)",
  "--featured-surface": "rgba(247, 244, 237, 0.06)",
  "--blue": "#4f9fe8",
  "--founder": "#ecc94b",
  "--campus-founder": "#5fce8f",
  "--hm0": "rgba(247, 244, 237, 0.07)",
  "--hm1": "#1e3a5f",
  "--hm2": "#2f6db0",
  "--hm3": "#4f9fe8",
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
