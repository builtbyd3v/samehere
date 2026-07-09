import { IconBolt, IconButterfly, IconCrown, IconGraduationCap } from "@/components/icons";

// ponytail: one badge component, all surfaces import it
export default function UserBadges({
  isPro,
  isFounder,
  isCampusFounder,
  isVerifiedStudent,
  className = "h-4 w-4",
}: {
  isPro?: boolean;
  isFounder?: boolean;
  isCampusFounder?: boolean;
  isVerifiedStudent?: boolean;
  className?: string;
}) {
  if (!isPro && !isFounder && !isCampusFounder && !isVerifiedStudent) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5">
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
