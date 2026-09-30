import type { ComponentType } from "react";
import { IconBolt, IconButterfly, IconCrown, IconGraduationCap } from "@/components/icons";
import { activeBadges, type BadgeFlags, type BadgeKey } from "@/lib/badges";

const ICON: Record<BadgeKey, ComponentType<{ className?: string }>> = {
  isVerifiedStudent: IconGraduationCap,
  isFounder: IconCrown,
  isCampusFounder: IconButterfly,
  isPro: IconBolt,
};

// ponytail: one badge component, all surfaces import it. One monochrome mark (highest
// priority); the full list is its label and the "Badges" row on the portfolio.
export default function UserBadges({
  isBot,
  className = "h-4 w-4",
  ...flags
}: BadgeFlags & { isBot?: boolean; className?: string }) {
  const badges = activeBadges(flags);
  if (!isBot && badges.length === 0) return null;
  const Icon = badges.length > 0 ? ICON[badges[0].key] : null;
  const label = badges.map((badge) => badge.label).join(", ");
  return (
    <span className="inline-flex shrink-0 items-center gap-1">
      {isBot && (
        // Text label, not an icon: the whole point is a viewer can't mistake
        // this for a person, so it needs to read as a word, not a glyph.
        <span
          role="img"
          aria-label="Bot account"
          title="Bot account"
          className="rounded-full bg-[var(--ink)] px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide text-[var(--canvas)]"
        >
          Bot
        </span>
      )}
      {Icon && (
        <span role="img" aria-label={label} title={label} className="text-[var(--muted)]">
          <Icon className={className} />
        </span>
      )}
    </span>
  );
}
