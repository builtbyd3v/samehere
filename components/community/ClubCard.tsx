import Link from "next/link";
import ClubAvatar from "@/components/clubs/ClubAvatar";
import ClubVerifiedBadge from "@/components/clubs/ClubVerifiedBadge";

type Club = {
  slug: string;
  name: string;
  purpose: string | null;
  avatar_url: string | null;
  is_verified: boolean;
};

// Shared club row, used by ClubsTab (community) and /search so both render
// clubs identically. `count` (member count) is optional — search results
// don't compute it.
export default function ClubCard({ club, count }: { club: Club; count?: number }) {
  return (
    <Link
      href={`/community/clubs/${club.slug}`}
      className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--canvas)] p-3 transition hover:bg-[var(--featured-surface)]"
    >
      <ClubAvatar url={club.avatar_url} name={club.name} className="h-9 w-9 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-1.5">
          <span className="truncate font-medium text-[var(--ink)]">{club.name}</span>
          {club.is_verified && <ClubVerifiedBadge />}
          {count !== undefined && (
            <span className="shrink-0 text-xs text-[var(--ink-muted)]">
              {count} {count === 1 ? "member" : "members"}
            </span>
          )}
        </div>
        <p className="truncate text-xs text-[var(--ink-muted)]">{club.purpose}</p>
      </div>
    </Link>
  );
}
