import type { CSSProperties } from "react";

// Curated Pro profile themes (plan 023). NOT a free-form color editor — that's
// an injection surface. A theme is a fixed preset: the user stores only this
// KEY (DB-allowlisted, see the profile_theme CHECK constraint), never raw
// CSS/color. Rendering maps key -> these pre-baked, safe tokens.
//
// Each preset ships an explicit light AND dark tint so it reads correctly in
// both themes (see globals.css .dark / prefers-color-scheme handling) without
// this module needing to know which one is active — `light-dark()` picks for
// us off the ambient `color-scheme` the app already sets via .light/.dark.
type ThemeTokens = {
  label: string;
  // Single hex accent, applied identically in both themes — same convention
  // as the existing manual accent_color (a small ring, not a large wash, so
  // one value reads fine on both cream and near-black surfaces).
  accent: string;
  tintLight: string;
  tintDark: string;
};

export const PROFILE_THEMES = {
  ember: { label: "Ember", accent: "#c2410c", tintLight: "rgba(194, 65, 12, 0.16)", tintDark: "rgba(240, 134, 90, 0.30)" },
  ocean: { label: "Ocean", accent: "#0369a1", tintLight: "rgba(3, 105, 161, 0.16)", tintDark: "rgba(79, 159, 232, 0.30)" },
  violet: { label: "Violet", accent: "#7c3aed", tintLight: "rgba(124, 58, 237, 0.16)", tintDark: "rgba(167, 139, 250, 0.30)" },
  forest: { label: "Forest", accent: "#15803d", tintLight: "rgba(21, 128, 61, 0.16)", tintDark: "rgba(95, 206, 143, 0.30)" },
  rose: { label: "Rose", accent: "#be123c", tintLight: "rgba(190, 18, 60, 0.16)", tintDark: "rgba(244, 114, 158, 0.30)" },
  slate: { label: "Slate", accent: "#334155", tintLight: "rgba(51, 65, 85, 0.16)", tintDark: "rgba(148, 163, 184, 0.30)" },
} as const satisfies Record<string, ThemeTokens>;

export type ProfileTheme = keyof typeof PROFILE_THEMES;

export const PROFILE_THEME_KEYS = Object.keys(PROFILE_THEMES) as ProfileTheme[];

export function isProfileTheme(value: unknown): value is ProfileTheme {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(PROFILE_THEMES, value);
}

// key -> CSS custom properties for the profile wrapper. `--profile-tint` uses
// light-dark() so a single inline style works in both themes without any new
// globals.css rule — light-dark() resolves off the ambient color-scheme the
// .light/.dark classes already set.
export function themeCssVars(key: string | null | undefined): CSSProperties | undefined {
  if (!isProfileTheme(key)) return undefined;
  const t = PROFILE_THEMES[key];
  return {
    "--profile-accent": t.accent,
    "--profile-tint": `light-dark(${t.tintLight}, ${t.tintDark})`,
  } as CSSProperties;
}
