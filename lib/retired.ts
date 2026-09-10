export const FEATURE_UNAVAILABLE = "This feature is unavailable.";

export function unavailableState(): { error: string } {
  return { error: FEATURE_UNAVAILABLE };
}
