import Link from "next/link";
import AvatarImage from "@/components/ui/AvatarImage";
import LocalTime from "@/components/ui/LocalTime";
import { IconAt, IconComment, IconSame } from "@/components/icons";
import {
  notificationHref,
  notificationLabel,
  type NotificationRow,
} from "@/lib/notifications";

// Local glyph: only used here as a notification-type badge, not a shared
// reaction icon, so it lives with the rest of the notification icon set below.
function IconUserPlus() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.5 20v-.8a6.2 6.2 0 0 1 12.4 0v.8" />
      <path d="M18 8v6M15 11h6" />
    </svg>
  );
}

function TypeBadge({ type }: { type: NotificationRow["type"] }) {
  if (type === "follow" || type === "follow_request") {
    return (
      <span className="grid h-[18px] w-[18px] place-items-center rounded-full border border-[var(--surface-card)] bg-[var(--ink)] text-[var(--canvas)]">
        <IconUserPlus />
      </span>
    );
  }
  if (type === "comment") {
    return (
      <span className="grid h-[18px] w-[18px] place-items-center rounded-full border border-[var(--surface-card)] bg-[var(--ink)] text-[var(--canvas)] [&_svg]:h-2.5 [&_svg]:w-2.5">
        <IconComment />
      </span>
    );
  }
  if (type === "referral_joined") {
    return (
      <span className="grid h-[18px] w-[18px] place-items-center rounded-full border border-[var(--surface-card)] bg-[var(--blue)] text-[var(--canvas)]">
        <IconUserPlus />
      </span>
    );
  }
  if (type === "mention") {
    return (
      <span className="grid h-[18px] w-[18px] place-items-center rounded-full border border-[var(--surface-card)] bg-[var(--ink)] text-[var(--canvas)] [&_svg]:h-2.5 [&_svg]:w-2.5">
        <IconAt />
      </span>
    );
  }
  return (
    <span className="grid h-[18px] w-[18px] place-items-center rounded-full border border-[var(--surface-card)] bg-[var(--ink)] text-[var(--canvas)] [&_svg]:h-2.5 [&_svg]:w-2.5">
      <IconSame />
    </span>
  );
}

function Avatar({ url, name, type, isPro }: { url: string | null; name: string; type: NotificationRow["type"]; isPro: boolean }) {
  return (
    <div className="relative shrink-0">
      {url ? (
        <AvatarImage
          src={url}
          alt=""
          className="h-10 w-10 rounded-full border border-[var(--border)] object-cover"
          pro={isPro}
        />
      ) : (
        <div className="grid h-10 w-10 place-items-center rounded-full border border-[var(--border)] bg-[var(--featured-surface)] text-sm font-semibold text-[var(--ink-muted)]">
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      <span className="absolute -bottom-0.5 -right-0.5">
        <TypeBadge type={type} />
      </span>
    </div>
  );
}

export default function NotificationList({ items }: { items: NotificationRow[] }) {
  if (items.length === 0) {
    return (
      <div className="px-6 py-14 text-center">
        <span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full border border-[var(--border)] text-[var(--ink-faint)]">
          <IconComment />
        </span>
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
          <li key={n.id} className="relative">
            {!n.read && (
              <span className="absolute left-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[var(--blue)]" aria-hidden />
            )}
            <Link
              href={href}
              className={`flex items-center gap-3 px-4 py-3.5 pl-5 transition hover:bg-[var(--featured-surface)] ${
                !n.read ? "bg-[var(--featured-surface)]/60" : ""
              }`}
            >
              <Avatar url={n.actor_avatar_url} name={actorName} type={n.type} isPro={n.actor_is_pro} />
              <div className="min-w-0 flex-1">
                <p className={`text-[15px] leading-snug text-[var(--ink)] ${!n.read ? "font-medium" : ""}`}>
                  {notificationLabel(n.type, actorName, n.reaction_type)}
                </p>
                <LocalTime iso={n.created_at} variant="notification" className="mt-0.5 block text-xs text-[var(--ink-faint)]" />
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

