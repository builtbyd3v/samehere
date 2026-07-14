import Link from "next/link";
import AvatarBase from "@/components/ui/Avatar";
import UserBadges from "@/components/profile/UserBadges";
import { IconChevronLeft } from "@/components/icons";
import MessageTime from "@/components/messages/MessageTime";
import DmMessageReport from "@/components/messages/DmMessageReport";
import DmThreadMenu from "@/components/messages/DmThreadMenu";
import GroupManage from "@/components/messages/GroupManage";
import type { DmMessage, GroupMember, ChatParticipant } from "@/lib/messages";

export default function MessageThread({
  messages,
  viewerId,
  members,
  roster,
}: {
  messages: DmMessage[];
  viewerId: string;
  /** Group roster, for per-bubble sender name/avatar. Omit for 1:1 threads (unchanged). */
  members?: GroupMember[];
  /** Every participant (peer/members + viewer) -- resolves the avatar/badge for
   * EVERY bubble, including the viewer's own, the way ClubChat does. Falls back
   * to `m.sender` (and then to a plain initial) when a message's sender_id
   * isn't in the roster. */
  roster?: ChatParticipant[];
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
        const sender: ChatParticipant | DmMessage["sender"] | undefined =
          roster?.find((p) => p.id === m.sender_id) ??
          members?.find((mem) => mem.id === m.sender_id) ??
          m.sender ??
          undefined;
        const name = sender?.display_name ?? sender?.username ?? "Member";
        const avatarUrl = sender?.avatar_url ?? null;
        const senderIsPro = sender?.is_pro ?? false;
        const senderSeed = sender?.username ?? name;
        return (
          <div
            key={m.id}
            className={`msg-in group flex items-end gap-2 ${mine ? "flex-row-reverse" : "justify-start"}`}
          >
            <AvatarBase
              src={avatarUrl}
              seed={senderSeed}
              name={name}
              pro={senderIsPro}
              className="h-7 w-7 shrink-0 rounded-full border border-[var(--border)] text-xs"
            />
            <div className={`flex max-w-[min(82%,24rem)] flex-col ${mine ? "items-end" : "items-start"}`}>
              {!mine && (
                <div className="mb-0.5 flex items-center gap-1 px-1 text-xs font-medium text-[var(--ink-muted)]">
                  <span>{name}</span>
                  <UserBadges isPro={senderIsPro} className="h-3 w-3" />
                </div>
              )}
              <div className="flex items-end gap-1">
                <div
                  className={`whitespace-pre-wrap break-words px-3.5 py-2.5 text-[15px] leading-relaxed ${
                    mine
                      ? "rounded-2xl rounded-br-md bg-[var(--ink)] text-[var(--canvas)]"
                      : "rounded-2xl rounded-bl-md border border-[var(--border)] bg-[var(--surface-post)] text-[var(--ink)]"
                  }`}
                >
                  {m.content}
                </div>
                {mine && senderIsPro && (
                  <span className="mb-0.5">
                    <UserBadges isPro className="h-3 w-3" />
                  </span>
                )}
                {!mine && (
                  <div className="mb-0.5 opacity-0 transition focus-within:opacity-100 group-hover:opacity-100">
                    <DmMessageReport messageId={m.id} viewerId={viewerId} />
                  </div>
                )}
              </div>
              <MessageTime iso={m.created_at} className="mt-1 px-1 text-[11px] text-[var(--ink-faint)]" />
            </div>
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
        <AvatarBase
          src={avatarUrl}
          seed={username}
          name={displayName}
          pro={isPro}
          className="h-9 w-9 rounded-full border border-[var(--border)] text-sm"
        />
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
  createdBy,
  isCreator,
}: {
  conversationId: string;
  title: string;
  members: GroupMember[];
  createdBy: string | null;
  isCreator: boolean;
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
        <AvatarBase
          seed={title}
          name={title}
          className="h-9 w-9 shrink-0 rounded-full border border-[var(--border)] text-sm"
        />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-[var(--ink)]">{title}</p>
          <p className="truncate text-xs text-[var(--ink-muted)]">{subtitle}</p>
        </div>
      </div>
      <GroupManage conversationId={conversationId} members={members} createdBy={createdBy} isCreator={isCreator} />
    </header>
  );
}
