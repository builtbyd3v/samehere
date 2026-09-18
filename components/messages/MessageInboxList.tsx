import Link from "next/link";
import AvatarBase from "@/components/ui/Avatar";
import MessageTime from "@/components/messages/MessageTime";
import type { InboxThread } from "@/lib/messages";
import { messages as messagesCopy } from "@/lib/copy-voice";

function Avatar({ url, seed, name, isPro }: { url: string | null; seed: string; name: string; isPro: boolean }) {
  return (
    <AvatarBase
      src={url}
      seed={seed}
      name={name}
      className="h-10 w-10 shrink-0 rounded-full border border-[var(--border)] text-sm"
      pro={isPro}
    />
  );
}

// Small overlapping avatar stack for a group row -- up to 3 members, no isPro
// ring (group rosters can be large; not worth a second RPC join for a list row).
function GroupAvatarStack({ members }: { members: { avatar_url: string | null; username: string }[] }) {
  const shown = members.slice(0, 3);
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center">
      <div className="relative h-10 w-10">
        {shown.map((m, i) => (
          <div key={i} className="absolute h-7 w-7 rounded-full ring-2 ring-[var(--surface-card)]" style={{ left: i * 8, top: i === 1 ? 8 : 0, zIndex: shown.length - i }}>
            <Avatar url={m.avatar_url} seed={m.username} name={m.username} isPro={false} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MessageInboxList({
  threads,
  viewerId,
}: {
  threads: InboxThread[];
  viewerId: string;
}) {
  return (
    <ul className="divide-y divide-[var(--border)]">
      {threads.map((t) => {
        const unread = Number(t.unread_count) > 0;
        const mine = t.last_sender_id === viewerId;
        const raw = t.last_message || messagesCopy.previewFallback;

        if (t.kind === "group") {
          const sender = t.members.find((m) => m.id === t.last_sender_id);
          const preview = mine
            ? `You: ${raw}`
            : sender
              ? `${sender.display_name ?? sender.username}: ${raw}`
              : raw;
          return (
            <li key={t.conversation_id}>
              <Link
                href={`/messages/${t.conversation_id}`}
                className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-[var(--featured-surface)]"
              >
                <GroupAvatarStack members={t.members} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className={`truncate text-[15px] ${unread ? "font-semibold text-[var(--ink)]" : "font-medium text-[var(--ink)]"}`}>
                      {t.title}
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
        }

        const name = t.peer_display_name ?? t.peer_username;
        const preview = mine ? `You: ${raw}` : raw;
        return (
          <li key={t.conversation_id}>
            <Link
              href={`/messages/${t.conversation_id}`}
              className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-[var(--featured-surface)]"
            >
              <Avatar url={t.peer_avatar_url} seed={t.peer_username} name={name} isPro={t.peer_is_pro} />
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
