import Link from "next/link";
import AvatarImage from "@/components/ui/AvatarImage";
import { IconChevronLeft } from "@/components/icons";
import { formatMessageTime, type DmMessage } from "@/lib/messages";

export default function MessageThread({
  messages,
  viewerId,
}: {
  messages: DmMessage[];
  viewerId: string;
}) {
  if (messages.length === 0) {
    return (
      <p className="px-5 py-16 text-center text-sm text-[var(--ink-muted)]">
        No messages yet. Say hello.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-5 sm:px-5">
      {messages.map((m) => {
        const mine = m.sender_id === viewerId;
        return (
          <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[min(82%,24rem)] ${mine ? "items-end" : "items-start"} flex flex-col`}>
              <div
                className={`whitespace-pre-wrap break-words px-3.5 py-2.5 text-[15px] leading-relaxed ${
                  mine
                    ? "rounded-2xl rounded-br-md bg-[var(--ink)] text-[var(--canvas)]"
                    : "rounded-2xl rounded-bl-md border border-[var(--border)] bg-[var(--surface-post)] text-[var(--ink)]"
                }`}
              >
                {m.content}
              </div>
              <time
                className="mt-1 px-1 text-[11px] text-[var(--ink-faint)]"
                dateTime={m.created_at}
              >
                {formatMessageTime(m.created_at)}
              </time>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function MessageThreadHeader({
  username,
  displayName,
  avatarUrl,
}: {
  username: string;
  displayName: string;
  avatarUrl: string | null;
}) {
  return (
    <header className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-card)] px-3 py-2.5 sm:px-4">
      <Link
        href="/messages"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[var(--ink-muted)] transition hover:bg-[var(--featured-surface)] hover:text-[var(--ink)]"
        aria-label="Back to inbox"
      >
        <IconChevronLeft />
      </Link>
      <Link
        href={`/profile/${username}`}
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-1 py-1 transition hover:bg-[var(--featured-surface)]"
      >
        {avatarUrl ? (
          <AvatarImage src={avatarUrl} alt="" className="h-9 w-9 rounded-full border border-[var(--border)] object-cover" />
        ) : (
          <div className="grid h-9 w-9 place-items-center rounded-full border border-[var(--border)] bg-[var(--featured-surface)] text-sm font-semibold text-[var(--ink-muted)]">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-[var(--ink)]">{displayName}</p>
          <p className="truncate text-xs text-[var(--ink-muted)]">@{username}</p>
        </div>
      </Link>
    </header>
  );
}
