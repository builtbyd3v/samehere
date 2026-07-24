import { IconBolt, IconButterfly, IconCrown, IconGraduationCap } from "@/components/icons";

// ponytail: one badge component, all surfaces import it
export default function UserBadges({
  isPro,
  isFounder,
  isCampusFounder,
  isVerifiedStudent,
  isBot,
  className = "h-4 w-4",
}: {
  isPro?: boolean;
  isFounder?: boolean;
  isCampusFounder?: boolean;
  isVerifiedStudent?: boolean;
  isBot?: boolean;
  className?: string;
}) {
  if (!isPro && !isFounder && !isCampusFounder && !isVerifiedStudent && !isBot) return null;
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
      {isFounder && (
        <span title="Founder" className="text-[var(--founder)]">
          <IconCrown className={className} />
        </span>
      )}
      {isCampusFounder && (
        <span role="img" aria-label="Social Butterfly" title="Social Butterfly" className="text-[var(--campus-founder)]">
          <IconButterfly className={className} />
        </span>
      )}
      {isVerifiedStudent && (
        <span title="Verified Student" className="text-[var(--ink-muted)]">
          <IconGraduationCap className={className} />
        </span>
      )}
      {isPro && (
        <span title="Pro" className="text-[var(--blue)]">
          <IconBolt className={className} />
        </span>
      )}
    </span>
  );
}
