// Canonical production origin. Used for shareable links (referral, OG) so they
// always point at the real domain regardless of the request host or preview URL.
// ponytail: one constant; override via NEXT_PUBLIC_SITE_URL only if the domain moves.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.samehere.dev";
