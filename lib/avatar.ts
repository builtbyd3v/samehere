/** True when the URL may be an animated image (GIF or animated WebP). */
export function isAnimatedAvatarUrl(src: string): boolean {
  const path = src.split("?")[0].split("#")[0].toLowerCase();
  return path.endsWith(".gif") || path.endsWith(".webp");
}

// Muted two-stop tints for the no-photo fallback (DESIGN.md, Avatar). Literal
// class strings so Tailwind generates them. White initials stay legible on all.
export const AVATAR_TINTS = [
  "bg-[linear-gradient(145deg,#3b77b8,#1e3a5f)]",
  "bg-[linear-gradient(145deg,#a0683c,#5a3820)]",
  "bg-[linear-gradient(145deg,#4f8a64,#24422f)]",
  "bg-[linear-gradient(145deg,#5a6d8a,#2c3648)]",
  "bg-[linear-gradient(145deg,#3f8a86,#1f4442)]",
  "bg-[linear-gradient(145deg,#8a4a5a,#44242c)]",
] as const;

// FNV-1a: stable across runs and platforms, unlike hashing via charCodeAt sums.
function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Tint class derived from a stable seed (username/slug/org name). */
export function avatarTintClass(seed: string): string {
  return AVATAR_TINTS[hashSeed(seed) % AVATAR_TINTS.length];
}

/** Up to two initials from the first two words, uppercased. "?" when there are none. */
export function avatarInitials(name: string): string {
  const words = name.match(/[\p{L}\p{N}]+/gu) ?? [];
  return words.slice(0, 2).map((w) => Array.from(w)[0].toUpperCase()).join("") || "?";
}
