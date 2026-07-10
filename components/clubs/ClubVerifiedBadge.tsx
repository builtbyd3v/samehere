import { IconVerified } from "@/components/icons";

// ponytail: one badge component, mirrors UserBadges' single-badge span idiom.
export default function ClubVerifiedBadge({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <span role="img" aria-label="Verified club" title="Verified club" className="text-[var(--blue)]">
      <IconVerified className={className} />
    </span>
  );
}
