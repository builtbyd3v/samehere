/** True when the URL may be an animated image (GIF or animated WebP). */
export function isAnimatedAvatarUrl(src: string): boolean {
  const path = src.split("?")[0].split("#")[0].toLowerCase();
  return path.endsWith(".gif") || path.endsWith(".webp");
}
