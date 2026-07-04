import Link from "next/link";
import AvatarImage from "@/components/ui/AvatarImage";
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
      <p className="px-4 py-8 text-center text-sm text-[var(--ink-muted)]">
        Say hello — your message stays between you two.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {messages.map((m) => {
        const mine = m.sender_id === viewerId;
        return (
          <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[min(85%,28rem)] rounded-2xl px-3.5 py-2.5 text-[15px] leading-relaxed ${
                mine
                  ? "bg-[var(--ink)] text-[var(--canvas)]"
                  : "border border-[var(--border)] bg-[var(--surface-card)] text-[var(--ink)]"
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{m.content}</p>
              <time
                className={`mt-1 block text-[10px] ${mine ? "text-[var(--canvas)]/70" : "text-[var(--ink-faint)]"}`}
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
    <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--surface-card)] px-4 py-3">
      <Link href="/messages" className="text-sm text-[var(--ink-muted)] hover:underline sm:hidden">
        ← Back
      </Link>
      <Link href={`/profile/${username}`} className="flex min-w-0 flex-1 items-center gap-2.5 hover:opacity-85">
        {avatarUrl ? (
          <AvatarImage src={avatarUrl} alt="" className="h-9 w-9 rounded-full border border-[var(--border)] object-cover" />
        ) : (
          <div className="grid h-9 w-9 place-items-center rounded-full border border-[var(--border)] bg-[var(--featured-surface)] text-sm font-semibold text-[var(--ink-muted)]">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate font-semibold text-[var(--ink)]">{displayName}</p>
          <p className="truncate text-xs text-[var(--ink-muted)]">@{username}</p>
        </div>
      </Link>
    </div>
  );
}
