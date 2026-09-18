/** Canonical share/unfurl copy — keep layout, landing meta, and OG image alt in sync. */

export const SITE_OG_TITLE = "samehere: Find your people. Show what you’re building.";

export const SITE_OG_DESCRIPTION =
  "A place for CS students to share the work, find a familiar struggle, and build a profile that feels like them.";

export const SITE_OG_ANNOUNCE = "For students, building together";

export const SITE_OG_HEADLINE = ["Find your people.", "Show what you’re building."] as const;

export function profileShareTitle(name: string): string {
  return `${name} on samehere`;
}

export function profileShareDescription(username: string): string {
  return `@${username}'s portfolio on samehere — projects, activity, and what they're building.`;
}

export function postShareTitle(name: string, username: string): string {
  return `${name} (@${username}) on samehere`;
}
