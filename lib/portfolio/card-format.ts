import { profileShareUrl } from "@/lib/portfolio/share";

export const CARD_FORMATS = ["landscape", "square", "story"] as const;
export type CardFormat = (typeof CARD_FORMATS)[number];

export const CARD_SIZES: Record<CardFormat, { width: number; height: number }> = {
  landscape: { width: 1200, height: 630 },
  square: { width: 1080, height: 1080 },
  story: { width: 1080, height: 1920 },
};

/** Missing or empty means landscape. Unknown means null, and the route answers 400. */
export function parseCardFormat(raw: string | null): CardFormat | null {
  if (raw === null || raw === "") return "landscape";
  return CARD_FORMATS.find((f) => f === raw) ?? null;
}

export function cardFilename(username: string, format: CardFormat): string {
  return `samehere-${username}-${format}.png`;
}

export function cardPath(username: string, format: CardFormat): string {
  return `/profile/${encodeURIComponent(username)}/card?format=${format}`;
}

/** "samehere.dev/profile/ada": the absolute share URL without scheme or www. */
export function cardUrlText(username: string): string {
  return profileShareUrl(username).replace(/^https?:\/\/(www\.)?/, "");
}

// Same shape as USERNAME_RE in lib/portfolio/metrics.ts:17.
const USERNAME_RE = /^[A-Za-z0-9_]{1,32}$/;
export function isCardUsername(value: string): boolean {
  return USERNAME_RE.test(value);
}

// Signed-in renders carry block context, so they stay private. Anonymous renders read only
// anon-safe RPCs, so a shared cache may keep them for 5 minutes (the landing embeds them).
export function cardCacheControl(signedIn: boolean): string {
  return signedIn ? "private, max-age=300" : "public, max-age=300, s-maxage=300";
}
