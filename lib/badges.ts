export type BadgeFlags = {
  isPro?: boolean;
  isFounder?: boolean;
  isCampusFounder?: boolean;
  isVerifiedStudent?: boolean;
};
export type BadgeKey = keyof BadgeFlags;
export type Badge = { key: BadgeKey; label: string };

/** Priority order. The first badge a person has is the one mark shown next to their name. */
export const BADGE_ORDER: readonly Badge[] = [
  { key: "isVerifiedStudent", label: "Verified student" },
  { key: "isFounder", label: "Founder" },
  { key: "isCampusFounder", label: "Social Butterfly" },
  { key: "isPro", label: "Pro" },
];

export function activeBadges(flags: BadgeFlags): Badge[] {
  return BADGE_ORDER.filter((badge) => Boolean(flags[badge.key]));
}
