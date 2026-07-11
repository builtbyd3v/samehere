"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AvatarImage from "@/components/ui/AvatarImage";
import UserBadges from "@/components/profile/UserBadges";
import MessageTime from "@/components/messages/MessageTime";
import EmptyState from "@/components/ui/EmptyState";
import ChannelBar, { type ClubChannel } from "@/components/clubs/ChannelBar";
import { IconSend } from "@/components/icons";
import { useSubmitShortcut } from "@/lib/useSubmitShortcut";
import { TEXT_LIMITS, textLimitError } from "@/lib/utils/validation";

const MAX = TEXT_LIMITS.message;
// Consecutive messages from the same sender within this window render as one
// visual block (avatar + name shown once) instead of repeating per bubble.
const GROUP_WINDOW_MS = 5 * 60 * 1000;

type Sender = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_pro: boolean;
};

type ClubMessage = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender: Sender | null;
};

function resizeTextarea(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
}

function sameGroup(prev: ClubMessage, cur: ClubMessage): boolean {
  if (prev.sender_id !== cur.sender_id) return false;
  return Math.abs(new Date(cur.created_at).getTime() - new Date(prev.created_at).getTime()) < GROUP_WINDOW_MS;
}

// Append a message by its real DB id, ignoring anything already present, then
// keep the list in timestamp order. This is the whole dedupe strategy -- see
// the module doc comment below for why no optimistic/tempId bookkeeping is
// needed.
function upsertMessage(prev: ClubMessage[], row: ClubMessage): ClubMessage[] {
  if (prev.some((x) => x.id === row.id)) return prev;
  return [...prev, row].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

// Club group chat, now multi-channel (v2): a club has N channels, each its
// own `messages` conversation, role-gated by RLS (can_read_channel). This
// component owns the channel list + selection; ChannelBar is presentational
// (+ its own create/delete RPC calls); ChannelMessages below owns one
// channel's message pane and is remounted (via `key`) whenever the selected
// channel changes -- that remount is the resubscribe: React's cleanup tears
// down the old postgres_changes subscription before the new one mounts, so
// there's no manual "switch channel" wiring to get wrong.
export default function ClubChat({
  clubId,
  viewerId,
  viewerRole,
}: {
  clubId: string;
  viewerId: string;
  viewerRole: string;
}) {
  const [supabase] = useState(createClient);
  const [channels, setChannels] = useState<ClubChannel[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("club_channels")
        .select("id, name, min_role, conversation_id, is_general")
        .eq("club_id", clubId)
        .order("created_at", { ascending: true })
        .returns<ClubChannel[]>();
      if (cancelled) return;
      const list = data ?? [];
      setChannels(list);
      setSelectedId((list.find((c) => c.is_general) ?? list[0])?.id ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, clubId]);

  function handleCreated(channel: ClubChannel) {
    setChannels((prev) => [...prev, channel]);
    setSelectedId(channel.id);
  }

  function handleDeleted(channelId: string) {
    setChannels((prev) => {
      const next = prev.filter((c) => c.id !== channelId);
      setSelectedId((cur) => (cur === channelId ? (next.find((c) => c.is_general) ?? next[0])?.id ?? null : cur));
      return next;
    });
  }

  const selected = channels.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--border)]">
      {!loading && channels.length > 0 && (
        <ChannelBar
          clubId={clubId}
          viewerRole={viewerRole}
          channels={channels}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onCreated={handleCreated}
          onDeleted={handleDeleted}
        />
      )}
      {loading ? (
        <p className="px-5 py-16 text-center text-sm text-[var(--ink-muted)]">Loading channels…</p>
      ) : selected ? (
        <ChannelMessages
          key={selected.id}
          conversationId={selected.conversation_id}
          channelName={selected.name}
          viewerId={viewerId}
        />
      ) : (
        <EmptyState title="No channels yet" description="You don't have access to any channel in this club." />
      )}
    </div>
  );
}

// One channel's message pane: load, realtime-subscribe, send. Scoped to a
// single conversation_id -- switching channels remounts this component
// entirely (see the `key` in the parent), so every hook below starts clean.
function ChannelMessages({
  conversationId,
  channelName,
  viewerId,
}: {
  conversationId: string;
  channelName: string;
  viewerId: string;
}) {
  const [supabase] = useState(createClient);
  const [messages, setMessages] = useState<ClubMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerSender, setViewerSender] = useState<Sender | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  // Known sender profiles, keyed by user id — seeded from the initial fetch's
  // join, filled in on demand for anyone whose first message arrives live.
  const senderCache = useRef<Map<string, Sender>>(new Map());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: messageRows }, { data: viewerRow }] = await Promise.all([
        supabase
          .from("messages")
          .select(
            "id, sender_id, content, created_at, sender:profiles!messages_sender_id_fkey(username, display_name, avatar_url, is_pro)",
          )
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true })
          .limit(200)
          .returns<ClubMessage[]>(),
        supabase
          .from("profiles")
          .select("username, display_name, avatar_url, is_pro")
          .eq("id", viewerId)
          .single(),
      ]);
      if (cancelled) return;
      for (const m of messageRows ?? []) {
        if (m.sender) senderCache.current.set(m.sender_id, m.sender);
      }
      if (viewerRow) senderCache.current.set(viewerId, viewerRow);
      setMessages(messageRows ?? []);
      setViewerSender(viewerRow ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, conversationId, viewerId]);

  useEffect(() => {
    const channel = supabase
      .channel(`club-channel:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const m = payload.new as {
            id: string;
            sender_id: string;
            content: string;
            created_at: string;
          };
          const cached = senderCache.current.get(m.sender_id) ?? null;
          setMessages((prev) => upsertMessage(prev, { ...m, sender: cached }));
          // First message from a member we haven't seen yet — fetch their
          // profile once and backfill it onto the row.
          if (!cached) {
            supabase
              .from("profiles")
              .select("username, display_name, avatar_url, is_pro")
              .eq("id", m.sender_id)
              .single()
              .then(({ data }) => {
                if (!data) return;
                senderCache.current.set(m.sender_id, data);
                setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, sender: data } : x)));
              });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" });
  }, [messages.length]);

  useSubmitShortcut(textareaRef, () => formRef.current?.requestSubmit(), !pending && !loading);

  // Dedupe strategy: NO optimistic placeholder rows. A send only ever adds a
  // message once it has a real DB id -- either from this insert's own REST
  // response, or from the Realtime echo, whichever arrives first; `upsertMessage`
  // (by id) makes the second arrival a no-op. That sidesteps the old bug
  // entirely: there is nothing to mis-correlate because there are no temp ids.
  //
  // Race 1 -- REST resolves first (the common case): `.insert().select().single()`
  // returns the row, upsertMessage appends it (sorted into place). The Realtime
  // broadcast for the same insert arrives moments later; upsertMessage sees the
  // id already present and returns `prev` unchanged. One row, correct position.
  //
  // Race 2 -- Realtime resolves first (slow network on our own REST call):
  // the postgres_changes payload arrives before our insert's response does;
  // upsertMessage appends it (fetching/backfilling the sender profile if new).
  // When our REST response then resolves, upsertMessage again sees the id
  // already present and no-ops. Same one row.
  //
  // Because matching is keyed on the DB-assigned id (never on sender_id or
  // array position), firing off several sends back-to-back can't cross-wire
  // two messages the way sender-id-only matching could -- each message's own
  // id is the only thing that ever identifies it.
  async function handleSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const el = textareaRef.current;
    const text = el?.value.trim() ?? "";
    if (!text || pending) return;
    const limitErr = textLimitError("Messages", MAX, text.length);
    if (limitErr) {
      setError(limitErr);
      return;
    }

    setError(null);
    setPending(true);
    if (el) {
      el.value = "";
      resizeTextarea(el);
    }

    const { data, error: insertError } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: viewerId, content: text })
      .select("id, sender_id, content, created_at")
      .single();

    if (insertError || !data) {
      setError("Could not send message. Try again.");
      if (el) {
        el.value = text;
        resizeTextarea(el);
        el.focus();
      }
    } else {
      setMessages((prev) => upsertMessage(prev, { ...data, sender: viewerSender }));
    }
    setPending(false);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto rounded-b-2xl bg-[var(--canvas)]">
        {loading ? (
          <p className="px-5 py-16 text-center text-sm text-[var(--ink-muted)]">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="px-5 py-16 text-center text-sm text-[var(--ink-muted)]">No messages yet. Say hello.</p>
        ) : (
          <div className="flex flex-col px-4 py-5 sm:px-5">
            {messages.map((m, i) => {
              const mine = m.sender_id === viewerId;
              const prev = messages[i - 1];
              const grouped = !!prev && sameGroup(prev, m);
              const name = m.sender?.display_name ?? m.sender?.username ?? "Member";
              return (
                <div
                  key={m.id}
                  className={`msg-in flex items-end gap-2 ${mine ? "flex-row-reverse" : "justify-start"} ${grouped ? "mt-0.5" : "mt-3"}`}
                >
                  {!mine &&
                    (grouped ? (
                      <div className="w-7 shrink-0" />
                    ) : m.sender?.avatar_url ? (
                      <AvatarImage
                        src={m.sender.avatar_url}
                        alt=""
                        pro={m.sender.is_pro}
                        className="h-7 w-7 shrink-0 rounded-full border border-[var(--border)] object-cover"
                      />
                    ) : (
                      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--featured-surface)] text-xs font-semibold text-[var(--ink-muted)]">
                        {name.charAt(0).toUpperCase()}
                      </div>
                    ))}
                  <div className={`flex max-w-[min(82%,24rem)] flex-col ${mine ? "items-end" : "items-start"}`}>
                    {!mine && !grouped && (
                      <div className="mb-0.5 flex items-center gap-1 px-1 text-xs font-medium text-[var(--ink-muted)]">
                        <span>{name}</span>
                        {m.sender && <UserBadges isPro={m.sender.is_pro} className="h-3 w-3" />}
                      </div>
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
                </div>
              );
            })}
          </div>
        )}
        <div ref={bottomRef} aria-hidden className="h-px shrink-0" />
      </div>
      <form
        ref={formRef}
        onSubmit={handleSend}
        className="shrink-0 border-t border-[var(--border)] bg-[var(--surface-card)] px-3 py-3 sm:px-4"
      >
        <div className="flex items-end gap-2 rounded-full border border-[var(--border)] bg-[var(--canvas)] px-4 py-2">
          <textarea
            ref={textareaRef}
            rows={1}
            required
            maxLength={MAX}
            disabled={loading}
            placeholder={`Message #${channelName}`}
            onInput={(e) => resizeTextarea(e.currentTarget)}
            className="max-h-32 min-h-[24px] flex-1 resize-none bg-transparent py-1 text-[15px] leading-relaxed text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={pending || loading}
            aria-label="Send message"
            className="btn-inset mb-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--ink)] text-[var(--canvas)] transition active:scale-[0.94] active:opacity-80 disabled:opacity-40 disabled:active:scale-100"
          >
            <IconSend />
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-2 px-2 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
