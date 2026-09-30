const BASE = "http://samehere.local";

/** Open-redirect guard + default post-auth dest. Recovery keeps /update-password via `next`. */
export function authSuccessDest(nextParam: string | null, fallback = "/feed"): string {
  if (!nextParam || !nextParam.startsWith("/") || nextParam.startsWith("//")) return fallback;
  // Browsers treat "\" as "/" and strip tab/newline, so "/\evil" or "/\t/evil" escape the origin.
  if (/[\\\u0000-\u001f\u007f]/.test(nextParam)) return fallback;
  try {
    const url = new URL(nextParam, BASE);
    if (url.origin !== BASE) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
