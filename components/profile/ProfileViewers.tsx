import Link from "next/link";
import AvatarImage from "@/components/ui/AvatarImage";
import { IconBolt } from "@/components/icons";
import { formatNotificationTime } from "@/lib/notifications";

export type ProfileViewer = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

// Small inline lock glyph — no eye/lock icon exists in components/icons.tsx yet,
// kept local so this stays a one-file, single-purpose addition.
function IconLock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function ViewerAvatar({ url, name }: { url: string | null; name: string }) {
  if (url) {
    return (
      <AvatarImage
        src={url}
        alt=""
        className="h-9 w-9 shrink-0 rounded-full border border-[var(--border)] object-cover"
      />
    );
  }
  return (
    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--featured-surface)] text-xs font-semibold text-[var(--ink-muted)]">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function ProfileViewers({
  isPro,
  count,
  recent,
}: {
  isPro: boolean;
  count: number;
  /** Real viewer rows — only passed in (non-empty) when isPro; empty for the locked view. */
  recent: ProfileViewer[];
}) {
  return (
    <section className="card mt-3 p-5 sm:p-6">
      <h2 className="mb-4 text-sm font-semibold text-[var(--ink)]">Recent profile views</h2>

      {count === 0 ? (
        <p className="text-sm text-[var(--ink-muted)]">No views yet.</p>
      ) : isPro ? (
        <>
          <p className="mb-3 text-sm text-[var(--ink-muted)]">
            <b className="text-[var(--ink)]">{count}</b> recent {count === 1 ? "view" : "views"}
          </p>
          <ul className="flex flex-col gap-1">
            {recent.map((v) => {
              const name = v.display_name ?? v.username;
              return (
                <li key={v.id}>
                  <Link
                    href={`/profile/${v.username}`}
                    className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-[var(--featured-surface)]"
                  >
                    <ViewerAvatar url={v.avatar_url} name={name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--ink)]">{name}</p>
                      <p className="truncate text-xs text-[var(--ink-muted)]">@{v.username}</p>
                    </div>
                    <time className="shrink-0 text-xs text-[var(--ink-faint)]" dateTime={v.created_at}>
                      {formatNotificationTime(v.created_at)}
                    </time>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <>
          <p className="mb-3 text-sm text-[var(--ink-muted)]">
            <b className="text-[var(--ink)]">{count}</b> recent {count === 1 ? "view" : "views"}
          </p>
          {/* ponytail: placeholder rows only — no real viewer data is fetched/sent for non-Pro, so there's nothing to leak past the blur. */}
          <ul className="flex flex-col gap-1">
            {Array.from({ length: Math.min(count, 5) }).map((_, i) => (
              <li key={i} className="flex items-center gap-3 px-2 py-1.5">
                <div className="h-9 w-9 shrink-0 rounded-full border border-[var(--border)] bg-[var(--featured-surface)] blur-sm" />
                <div className="min-w-0 flex-1 select-none blur-sm">
                  <p className="truncate text-sm font-medium text-[var(--ink)]">Hidden viewer</p>
                  <p className="truncate text-xs text-[var(--ink-muted)]">@hidden</p>
                </div>
                <IconLock />
              </li>
            ))}
          </ul>
          <Link
            href="/pro"
            className="btn-inset mt-4 flex w-full items-center justify-center gap-1.5 rounded-md bg-[var(--ink)] px-4 py-2.5 text-sm font-medium text-[var(--canvas)] transition active:scale-[0.98] active:opacity-80"
          >
            <IconBolt className="h-4 w-4" />
            See who viewed you · Pro
          </Link>
        </>
      )}
    </section>
  );
}
