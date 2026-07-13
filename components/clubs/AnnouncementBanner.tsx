import Link from "next/link";
import AvatarBase from "@/components/ui/Avatar";
import UserBadges from "@/components/profile/UserBadges";
import LocalTime from "@/components/ui/LocalTime";
import type { ClubMemberProfile } from "./MemberRow";

type BannerAnnouncement = {
  body: string;
  created_at: string;
  author: ClubMemberProfile | null;
  authorRole: string | null;
};

// Only owner/officer are meaningful roles to call out; plain members render
// no pill (mirrors the "render nothing for Member" spec).
function RolePill({ role }: { role: string | null }) {
  if (role !== "owner" && role !== "officer") return null;
  return (
    <span className="shrink-0 rounded-full border border-[var(--border)] px-2 py-0.5 text-[11px] capitalize text-[var(--ink-muted)]">
      {role}
    </span>
  );
}

// Always-visible pinned strip (below the club header, above the tabs) so an
// accepted member never misses the latest announcement no matter which tab
// they're on. Same .card surface + calm voice as every other card in the app
// (cf. WeeklyRecap) -- no tinted/featured surface, no colored icon, no
// uppercase tracked label. The pin is a quiet ink-muted marker.
export default function AnnouncementBanner({ announcement }: { announcement: BannerAnnouncement | null }) {
  if (!announcement) return null;
  const { author, authorRole } = announcement;
  const name = author?.display_name ?? author?.username ?? "Unknown";

  return (
    <div className="card mt-4 p-4">
      <p className="mb-2.5 text-xs font-medium text-[var(--ink-muted)]">Pinned announcement</p>
      <div className="flex items-start gap-3">
        <AvatarBase
          src={author?.avatar_url}
          seed={author?.username ?? name}
          name={name}
          className="h-9 w-9 shrink-0 rounded-full border border-[var(--border)] text-sm"
          pro={author?.is_pro}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
            {author ? (
              <Link href={`/profile/${author.username}`} className="font-medium text-[var(--ink)] hover:underline">
                {name}
              </Link>
            ) : (
              <span className="font-medium text-[var(--ink)]">{name}</span>
            )}
            {author && (
              <UserBadges
                isPro={author.is_pro}
                isFounder={author.is_founder}
                isCampusFounder={author.is_campus_founder}
                isVerifiedStudent={author.verified_student}
              />
            )}
            <RolePill role={authorRole} />
            <span className="text-[var(--ink-muted)]">·</span>
            <LocalTime iso={announcement.created_at} variant="ago" className="text-xs text-[var(--ink-muted)]" />
          </div>
          <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm text-[var(--ink)]">{announcement.body}</p>
        </div>
      </div>
    </div>
  );
}
