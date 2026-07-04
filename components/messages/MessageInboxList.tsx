import Link from "next/link";
import AvatarImage from "@/components/ui/AvatarImage";
import { formatMessageTime, type DmInboxRow } from "@/lib/messages";

export default function MessageInboxList({ threads }: { threads: DmInboxRow[] }) {
  if (threads.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] px-6 py-12 text-center">
        <p className="font-medium text-[var(--ink)]">No messages yet</p>
        <p className="mt-1.5 text-sm text-[var(--ink-muted)]">
          Visit someone&apos;s profile and tap Message to start a conversation.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {threads.map((t) => {
        const name = t.peer_display_name ?? t.peer_username;
        const preview = t.last_message || "No messages yet";
        const unread = Number(t.unread_count) > 0;
        return (
          <li key={t.conversation_id}>
            <Link
              href={`/messages/${t.conversation_id}`}
              className={`flex items-center gap-3 rounded-xl border border-[var(--border)] p-3 transition hover:bg-[var(--featured-surface)] ${
                unread ? "bg-[var(--surface-card)]" : "bg-[var(--canvas)]"
              }`}
            >
              {t.peer_avatar_url ? (
                <AvatarImage
                  src={t.peer_avatar_url}
                  alt=""
                  className="h-11 w-11 shrink-0 rounded-full border border-[var(--border)] object-cover"
                />
              ) : (
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--featured-surface)] text-sm font-semibold text-[var(--ink-muted)]">
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className={`truncate text-sm ${unread ? "font-semibold text-[var(--ink)]" : "font-medium text-[var(--ink)]"}`}>
                    {name}
                  </p>
                  <time className="shrink-0 text-xs text-[var(--ink-faint)]" dateTime={t.last_message_at}>
                    {formatMessageTime(t.last_message_at)}
                  </time>
                </div>
                <p className={`mt-0.5 truncate text-sm ${unread ? "font-medium text-[var(--ink)]" : "text-[var(--ink-muted)]"}`}>
                  {preview}
                </p>
              </div>
              {unread && (
                <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-[var(--blue)] px-1.5 text-[10px] font-semibold text-white">
                  {Number(t.unread_count) > 9 ? "9+" : t.unread_count}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
