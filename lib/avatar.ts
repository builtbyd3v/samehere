/** True when the URL may be an animated image (GIF or animated WebP). */
export function isAnimatedAvatarUrl(src: string): boolean {
  const path = src.split("?")[0].split("#")[0].toLowerCase();
  return path.endsWith(".gif") || path.endsWith(".webp");
}

// Curated hues for the no-photo fallback disc. Skips muddy yellow/green bands
// so white text stays legible at 58% sat / 48% light on every one.
const AVATAR_HUES = [214, 262, 292, 330, 12, 152, 190, 240];

// FNV-1a: stable across runs and platforms, unlike hashing via charCodeAt sums.
function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Solid fallback color derived from a stable seed (username/slug/org name). */
export function avatarColor(seed: string): string {
  const hue = AVATAR_HUES[hashSeed(seed) % AVATAR_HUES.length];
  return `hsl(${hue} 58% 48%)`;
}

/** First alphanumeric of a name, uppercased. "?" when there is none. */
export function avatarInitial(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, "").charAt(0).toUpperCase() || "?";
}
