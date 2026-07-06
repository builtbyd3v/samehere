import Link from "next/link";
import AvatarImage from "@/components/ui/AvatarImage";
import MessageTime from "@/components/messages/MessageTime";
import type { DmInboxRow } from "@/lib/messages";

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

export default function MessageInboxList({
  threads,
  viewerId,
}: {
  threads: DmInboxRow[];
  viewerId: string;
}) {
  if (threads.length === 0) {
    return (
      <div className="px-6 py-14 text-center">
        <p className="text-sm font-medium text-[var(--ink)]">No conversations yet</p>
        <p className="mx-auto mt-1.5 max-w-[28ch] text-sm leading-relaxed text-[var(--ink-muted)]">
          Start one from a profile, or search above.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-[var(--border)]">
      {threads.map((t) => {
        const name = t.peer_display_name ?? t.peer_username;
        const mine = t.last_sender_id === viewerId;
        const raw = t.last_message || "Say hello";
        const preview = mine ? `You: ${raw}` : raw;
        const unread = Number(t.unread_count) > 0;
        return (
          <li key={t.conversation_id}>
            <Link
              href={`/messages/${t.conversation_id}`}
              className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-[var(--featured-surface)]"
            >
              <Avatar url={t.peer_avatar_url} name={name} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className={`truncate text-[15px] ${unread ? "font-semibold text-[var(--ink)]" : "font-medium text-[var(--ink)]"}`}>
                    {name}
                  </p>
                  <MessageTime iso={t.last_message_at} className="shrink-0 text-xs text-[var(--ink-faint)]" />
                </div>
                <p className={`mt-0.5 truncate text-sm ${unread ? "text-[var(--ink)]" : "text-[var(--ink-muted)]"}`}>
                  {preview}
                </p>
              </div>
              {unread && (
                <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--ink)]" aria-label="Unread" />
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
