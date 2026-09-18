/** Anon only for a real anonymous viewer, or an owner who asked for public preview.
 * A signed-in blocked viewer must never be swapped to anon. */
export function useAnonPortfolioReads(hasAuthCookie: boolean, ownerPublicPreview = false): boolean {
  if (ownerPublicPreview) return true;
  return !hasAuthCookie;
}
