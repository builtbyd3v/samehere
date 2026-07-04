import Link from "next/link";
import AvatarImage from "@/components/ui/AvatarImage";
import {
  formatNotificationTime,
  notificationHref,
  notificationLabel,
  type NotificationRow,
} from "@/lib/notifications";

function Avatar({ url, name }: { url: string | null; name: string }) {
  if (url) {
    return (
      <AvatarImage
        src={url}
        alt=""
        className="h-10 w-10 shrink-0 rounded-full border border-[var(--border)] object-cover"
      />
    );
  }
  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--featured-surface)] text-sm font-semibold text-[var(--ink-muted)]">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function NotificationList({ items }: { items: NotificationRow[] }) {
  if (items.length === 0) {
    return (
      <div className="px-6 py-14 text-center">
        <p className="text-sm font-medium text-[var(--ink)]">Nothing new</p>
        <p className="mx-auto mt-1.5 max-w-[28ch] text-sm text-[var(--ink-muted)]">
          Follows, comments, and reactions show up here.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-[var(--border)]">
      {items.map((n) => {
        const actorName = n.actor_display_name ?? n.actor_username;
        const href = notificationHref(n);
        return (
          <li key={n.id}>
            <Link
              href={href}
              className={`flex items-center gap-3 px-4 py-3.5 transition hover:bg-[var(--featured-surface)] ${
                !n.read ? "bg-[var(--featured-surface)]/60" : ""
              }`}
            >
              <Avatar url={n.actor_avatar_url} name={actorName} />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] leading-snug text-[var(--ink)]">
                  {notificationLabel(n.type, actorName, n.reaction_type)}
                </p>
                <time className="mt-0.5 block text-xs text-[var(--ink-faint)]" dateTime={n.created_at}>
                  {formatNotificationTime(n.created_at)}
                </time>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
