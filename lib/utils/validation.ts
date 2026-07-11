// Mirrors the DB guards on profiles.username (charset CHECK + username_not_reserved).
// The DB is the source of truth; this exists only for fast, specific form errors.
// KEEP IN SYNC with the `username_not_reserved` constraint in Supabase.
export const RESERVED_USERNAMES = new Set([
  "edit", "api", "dashboard", "feed", "post", "login",
  "signup", "auth", "admin", "profile", "search", "saved",
]);

// Returns a human error string, or null when the username is acceptable.
export function usernameError(username: string): string | null {
  if (!/^[a-z0-9_]{3,20}$/.test(username))
    return "Username must be 3-20 characters: lowercase letters, numbers, or underscores.";
  if (RESERVED_USERNAMES.has(username)) return "That username is reserved.";
  return null;
}

/** Character caps for user-generated text. Enforce server-side; mirror in UI maxLength. */
export const TEXT_LIMITS = {
  post: 280,
  comment: 280,
  message: 2000,
  quoteRepost: 500,
  feedback: 1000,
  reportDetail: 500,
  searchQuery: 100,
  dmUserSearch: 80,
  groupTitle: 60,
} as const;

export function textLimitError(label: string, max: number, length: number): string | null {
  if (length > max) return `${label} are capped at ${max} characters.`;
  return null;
}
