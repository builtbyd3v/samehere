import LocalTime from "@/components/ui/LocalTime";
import { IconPin } from "@/components/icons";

type BannerAnnouncement = {
  body: string;
  created_at: string;
  author: { username: string; display_name: string | null } | null;
};

// Always-visible pinned strip (below the club header, above the tabs) so an
// accepted member never misses the latest announcement no matter which tab
// they're on. Full history + composer live in the Announcements tab; this is
// deliberately a summary, not a duplicate of that list.
export default function AnnouncementBanner({ announcement }: { announcement: BannerAnnouncement | null }) {
  if (!announcement) return null;
  const name = announcement.author?.display_name ?? announcement.author?.username ?? "Unknown";

  return (
    <div className="card mt-4 flex gap-3 border-l-2 border-l-[var(--blue)] bg-[var(--featured-surface)] p-3.5 sm:p-4">
      <IconPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--blue)]" />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--ink-muted)]">
          <span className="font-semibold uppercase tracking-wide text-[var(--blue)]">Pinned</span>
          <span>·</span>
          <span className="font-medium text-[var(--ink)]">{name}</span>
          <span>·</span>
          <LocalTime iso={announcement.created_at} variant="ago" />
        </div>
        <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm text-[var(--ink)]">{announcement.body}</p>
      </div>
    </div>
  );
}
