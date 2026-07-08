import { IconBolt, IconCrown, IconGradCap } from "@/components/icons";

// ponytail: one badge component, all surfaces import it
export default function UserBadges({
  isPro,
  isFounder,
  isCampusFounder,
  className = "h-4 w-4",
}: {
  isPro?: boolean;
  isFounder?: boolean;
  isCampusFounder?: boolean;
  className?: string;
}) {
  if (!isPro && !isFounder && !isCampusFounder) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5">
      {isFounder && (
        <span title="Founder" className="text-[var(--founder)]">
          <IconCrown className={className} />
        </span>
      )}
      {isCampusFounder && (
        <span title="Campus Founder" className="text-[var(--campus-founder)]">
          <IconGradCap className={className} />
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
