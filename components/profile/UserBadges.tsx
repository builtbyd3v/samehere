import { IconBolt, IconCrown } from "@/components/icons";

// ponytail: one badge component, all surfaces import it
export default function UserBadges({
  isPro,
  isFounder,
  className = "h-4 w-4",
}: {
  isPro?: boolean;
  isFounder?: boolean;
  className?: string;
}) {
  if (!isPro && !isFounder) return null;
  return (
    <>
      {isFounder && (
        <span title="Founder" className="text-[var(--blue)]">
          <IconCrown className={className} />
        </span>
      )}
      {isPro && (
        <span title="Pro" className="text-[var(--blue)]">
          <IconBolt className={className} />
        </span>
      )}
    </>
  );
}
