/** Open-redirect guard + default post-auth dest. Recovery keeps /update-password via `next`. */
export function authSuccessDest(nextParam: string | null, fallback = "/feed"): string {
  if (nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")) return nextParam;
  return fallback;
}
