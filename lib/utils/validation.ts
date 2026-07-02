// .edu email gate. UX check only — the real proof of enrollment is the confirmed
// email round-trip (see CLAUDE.md Security #8), not this string check.
// Parses the domain off the LAST '@', lowercases it, and requires a real .edu.
export function isEduEmail(email: string): boolean {
  const at = email.lastIndexOf("@");
  // at === 0 → empty local part; at === -1 → no '@'; two '@' → indexes differ.
  if (at <= 0 || at !== email.indexOf("@")) return false;
  const domain = email.slice(at + 1).trim().toLowerCase();
  if (!domain || domain.startsWith(".") || domain.endsWith(".") || domain.includes("..")) return false;
  return /\.edu$/.test(domain);
}

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
    return "Username must be 3–20 characters — lowercase letters, numbers, or underscores.";
  if (RESERVED_USERNAMES.has(username)) return "That username is reserved.";
  return null;
}
