import Link from "next/link";
import ContextLabelBadge from "@/components/ui/ContextLabelBadge";
import { lookingForTeamFeedPath } from "@/lib/team-event";

export default function LookingForTeamChip({ active }: { active: boolean }) {
  return (
    <Link
      href={active ? "/feed" : lookingForTeamFeedPath()}
      aria-current={active ? "page" : undefined}
      className={active ? undefined : "opacity-55 transition hover:opacity-100"}
    >
      <ContextLabelBadge label="looking_for_team" />
    </Link>
  );
}
