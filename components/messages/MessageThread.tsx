import Link from "next/link";
import AvatarImage from "@/components/ui/AvatarImage";
import { IconChevronLeft } from "@/components/icons";
import MessageTime from "@/components/messages/MessageTime";
import DmMessageReport from "@/components/messages/DmMessageReport";
import DmThreadMenu from "@/components/messages/DmThreadMenu";
import type { DmMessage, GroupMember } from "@/lib/messages";

export default function MessageThread({
  messages,
  viewerId,
  members,
}: {
  messages: DmMessage[];
  viewerId: string;
  /** Group roster, for per-bubble sender name/avatar. Omit for 1:1 threads (unchanged). */
  members?: GroupMember[];
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
        const sender = members?.find((mem) => mem.id === m.sender_id);
        return (
          <div key={m.id} className={`msg-in group flex items-start gap-1 ${mine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[min(82%,24rem)] ${mine ? "items-end" : "items-start"} flex flex-col`}>
              {sender && !mine && (
                <p className="mb-0.5 px-1 text-xs font-medium text-[var(--ink-muted)]">
                  {sender.display_name ?? sender.username}
                </p>
              )}
              <div
                className={`whitespace-pre-wrap break-words px-3.5 py-2.5 text-[15px] leading-relaxed ${
                  mine
                    ? "rounded-2xl rounded-br-md bg-[var(--ink)] text-[var(--canvas)]"
                    : "rounded-2xl rounded-bl-md border border-[var(--border)] bg-[var(--surface-post)] text-[var(--ink)]"
                }`}
              >
                {m.content}
              </div>
              <MessageTime iso={m.created_at} className="mt-1 px-1 text-[11px] text-[var(--ink-faint)]" />
            </div>
            {!mine && (
              <div className="mt-0.5 opacity-0 transition focus-within:opacity-100 group-hover:opacity-100">
                <DmMessageReport messageId={m.id} viewerId={viewerId} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function MessageThreadHeader({
  conversationId,
  username,
  displayName,
  avatarUrl,
  isPro = false,
}: {
  conversationId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  /** The PEER's is_pro — gates their animated avatar, not the viewer's. */
  isPro?: boolean;
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
          <AvatarImage src={avatarUrl} alt="" pro={isPro} className="h-9 w-9 rounded-full border border-[var(--border)] object-cover" />
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
      <DmThreadMenu conversationId={conversationId} />
    </header>
  );
}

export function GroupThreadHeader({
  conversationId,
  title,
  members,
}: {
  conversationId: string;
  title: string;
  members: GroupMember[];
}) {
  const subtitle = members.map((m) => m.display_name ?? m.username).join(", ");
  return (
    <header className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-card)] px-3 py-2.5 sm:px-4">
      <Link
        href="/messages"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[var(--ink-muted)] transition hover:bg-[var(--featured-surface)] hover:text-[var(--ink)]"
        aria-label="Back to inbox"
      >
        <IconChevronLeft />
      </Link>
      <div className="flex min-w-0 flex-1 items-center gap-2.5 px-1 py-1">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--featured-surface)] text-sm font-semibold text-[var(--ink-muted)]">
          {title.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-[var(--ink)]">{title}</p>
          <p className="truncate text-xs text-[var(--ink-muted)]">{subtitle}</p>
        </div>
      </div>
      <DmThreadMenu conversationId={conversationId} />
    </header>
  );
}
