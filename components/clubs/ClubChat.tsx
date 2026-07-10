"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AvatarImage from "@/components/ui/AvatarImage";
import UserBadges from "@/components/profile/UserBadges";
import MessageTime from "@/components/messages/MessageTime";
import { IconSend } from "@/components/icons";
import { useSubmitShortcut } from "@/lib/useSubmitShortcut";
import { TEXT_LIMITS, textLimitError } from "@/lib/utils/validation";

const MAX = TEXT_LIMITS.message;

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

// Merge a "real" row (id assigned by the DB) into state, regardless of
// whether it arrived via the insert's REST response or the Realtime
// postgres_changes broadcast — those two paths race with no ordering
// guarantee, so both funnel through here to keep exactly one row per message:
//  - if the real id is already present, the other path won the race — just
//    drop the now-redundant optimistic placeholder.
//  - else if a still-pending optimistic row for this sender exists, replace
//    it in place (preserves list position + its cached sender).
//  - else append (a message from someone else, or ours with no pending row).
function mergeRealMessage(
  prev: ClubMessage[],
  real: { id: string; sender_id: string; content: string; created_at: string },
  fallbackSender: Sender | null,
): ClubMessage[] {
  if (prev.some((x) => x.id === real.id)) {
    return prev.filter((x) => !(x.id.startsWith("optimistic-") && x.sender_id === real.sender_id));
  }
  const optimisticIdx = prev.findIndex((x) => x.id.startsWith("optimistic-") && x.sender_id === real.sender_id);
  if (optimisticIdx !== -1) {
    return prev.map((x, i) => (i === optimisticIdx ? { ...real, sender: x.sender } : x));
  }
  return [...prev, { ...real, sender: fallbackSender }];
}

// Club group chat. Reuses the DM `messages` table + Realtime publication
// (see components/messages/MessageThreadLive.tsx) but, unlike a 2-party DM,
// a club has N members so every message needs its own sender identity
// (avatar + name + Pro badge) rather than relying on a peer header.
// RLS ('club member reads/sends message') is the real gate; the parent only
// renders this for accepted members, so no membership check here.
export default function ClubChat({
  clubId,
  conversationId,
  viewerId,
}: {
  clubId: string;
  conversationId: string;
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
      .channel(`club:${clubId}:${conversationId}`)
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
          setMessages((prev) => mergeRealMessage(prev, m, cached));
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
  }, [supabase, clubId, conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" });
  }, [messages.length]);

  useSubmitShortcut(textareaRef, () => formRef.current?.requestSubmit(), !pending && !loading);

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

    const tempId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setMessages((prev) => [
      ...prev,
      { id: tempId, sender_id: viewerId, content: text, created_at: new Date().toISOString(), sender: viewerSender },
    ]);
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
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setError("Could not send message. Try again.");
      if (el) {
        el.value = text;
        resizeTextarea(el);
        el.focus();
      }
    } else {
      // If Realtime already delivered this row (raced ahead of this REST
      // response), mergeRealMessage drops the tempId placeholder instead of
      // converting it into a second row with the same real id.
      setMessages((prev) => mergeRealMessage(prev, data, viewerSender));
    }
    setPending(false);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--canvas)]">
        {loading ? (
          <p className="px-5 py-16 text-center text-sm text-[var(--ink-muted)]">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="px-5 py-16 text-center text-sm text-[var(--ink-muted)]">No messages yet. Say hello.</p>
        ) : (
          <div className="flex flex-col gap-4 px-4 py-5 sm:px-5">
            {messages.map((m) => {
              const mine = m.sender_id === viewerId;
              const name = m.sender?.display_name ?? m.sender?.username ?? "Member";
              return (
                <div key={m.id} className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : "justify-start"}`}>
                  {!mine &&
                    (m.sender?.avatar_url ? (
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
                    {!mine && (
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
            placeholder="Message the club"
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
