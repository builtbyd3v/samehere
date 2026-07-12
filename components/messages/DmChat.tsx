"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import posthog from "posthog-js";
import { getBrowserClient } from "@/lib/supabase/client";
import MessageThread from "@/components/messages/MessageThread";
import { icebreaker } from "@/app/(app)/messages/actions";
import { IconSend } from "@/components/icons";
import { useSubmitShortcut } from "@/lib/useSubmitShortcut";
import { TEXT_LIMITS, textLimitError } from "@/lib/utils/validation";
import type { DmMessage, GroupMember, ChatParticipant } from "@/lib/messages";

const MAX = TEXT_LIMITS.message;

function resizeTextarea(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
}

// Append any messages from `incoming` not already present, sorted by created_at.
// From MessageThreadLive: covers this component's instance persisting across a
// thread-to-thread navigation (React reuses it since it sits in the same JSX
// position), where a fresh server-rendered `initialMessages` needs folding in.
function mergeById(current: DmMessage[], incoming: DmMessage[]): DmMessage[] {
  const seen = new Set(current.map((m) => m.id));
  const added = incoming.filter((m) => !seen.has(m.id));
  if (added.length === 0) return current;
  return [...current, ...added].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

// Append a message by its real DB id, ignoring anything already present, then
// keep the list in timestamp order. Mirrors ClubChat's upsertMessage.
function upsertMessage(prev: DmMessage[], row: DmMessage): DmMessage[] {
  if (prev.some((x) => x.id === row.id)) return prev;
  return [...prev, row].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

// Owns the whole DM thread surface: live message list + composer. Send is an
// instant client-side insert under RLS -- mirrors components/clubs/ClubChat.tsx's
// settled pattern exactly.
//
// Dedupe strategy: NO optimistic placeholder rows. A send only ever adds a
// message once it has a real DB id -- either from this insert's own REST
// response, or from the Realtime echo, whichever arrives first; `upsertMessage`
// (by id) makes the second arrival a no-op. There is nothing to mis-correlate
// because there are no temp ids.
//
// Race 1 -- REST resolves first (the common case): `.insert().select().single()`
// returns the row, upsertMessage appends it (sorted into place). The Realtime
// broadcast for the same insert arrives moments later; upsertMessage sees the
// id already present and returns `prev` unchanged.
//
// Race 2 -- Realtime resolves first (slow network on our own REST call): the
// postgres_changes payload arrives before our insert's response does;
// upsertMessage appends it. When our REST response then resolves, upsertMessage
// again sees the id already present and no-ops. Same one row.
export default function DmChat({
  conversationId,
  initialMessages,
  viewerId,
  peerId,
  viewerIsPro = false,
  members,
  roster,
}: {
  conversationId: string;
  initialMessages: DmMessage[];
  viewerId: string;
  peerId?: string;
  viewerIsPro?: boolean;
  /** Group roster, for per-bubble sender name/avatar. Omit for 1:1 threads (unchanged). */
  members?: GroupMember[];
  /** Every participant (peer/members + viewer), for per-bubble avatar/badge lookup on ANY bubble, including own. */
  roster?: ChatParticipant[];
}) {
  const [supabase] = useState(getBrowserClient);
  const [messages, setMessages] = useState<DmMessage[]>(initialMessages);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drafting, startDraft] = useTransition();
  const [draftNotice, setDraftNotice] = useState<"locked" | "error" | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Folds in a fresh server-rendered `initialMessages` when this component
  // instance persists across a thread-to-thread navigation (see mergeById above).
  const [prevInitialMessages, setPrevInitialMessages] = useState(initialMessages);
  if (initialMessages !== prevInitialMessages) {
    setPrevInitialMessages(initialMessages);
    setMessages((prev) => mergeById(prev, initialMessages));
  }

  useEffect(() => {
    const channel = supabase
      .channel(`dm:${conversationId}`)
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
          setMessages((prev) => upsertMessage(prev, { ...m, sender: null }));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, conversationId]);

  // Scroll to newest whenever the count changes (initial load or a live message).
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" });
  }, [messages.length]);

  useSubmitShortcut(textareaRef, () => formRef.current?.requestSubmit(), !pending);

  // Available to everyone: drop an AI-drafted intro into the (editable)
  // composer. Free users get a metered taste (3/day); Pro is unlimited --
  // gating happens server-side in the action, not here.
  function onDraftIntro() {
    if (!peerId || drafting) return;
    setDraftNotice(null);
    startDraft(async () => {
      const res = await icebreaker(peerId);
      if ("text" in res) {
        const el = textareaRef.current;
        if (el) {
          el.value = res.text;
          resizeTextarea(el);
          el.focus();
        }
      } else if ("locked" in res) {
        setDraftNotice("locked");
      } else {
        setDraftNotice("error");
      }
    });
  }

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
      setMessages((prev) => upsertMessage(prev, { ...data, sender: null }));
      posthog.capture("message_sent", {
        conversation_id: conversationId,
        character_count: text.length,
      });
      el?.focus();
    }
    setPending(false);
  }

  const empty = messages.length === 0;

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--canvas)]">
        <MessageThread messages={messages} viewerId={viewerId} members={members} roster={roster} />
        <div ref={bottomRef} aria-hidden className="h-px shrink-0" />
      </div>
      <form
        ref={formRef}
        onSubmit={handleSend}
        className="shrink-0 border-t border-[var(--border)] bg-[var(--surface-card)] px-3 py-3 sm:px-4"
      >
        {empty && peerId && (
          <div className="mb-2 px-1">
            <button
              type="button"
              onClick={onDraftIntro}
              disabled={drafting}
              className="text-xs font-medium text-[var(--blue)] underline disabled:opacity-50"
            >
              {drafting ? "Drafting…" : "✦ Draft an intro"}
              {viewerIsPro && <span className="text-[var(--ink-faint)]"> (150 a day)</span>}
            </button>
            {draftNotice === "locked" && (
              <p className="mt-1 text-xs text-[var(--ink-muted)]">
                Out of free suggestions today.{" "}
                <Link href="/pro" className="font-medium text-[var(--blue)] underline">
                  Go Pro for 150 a day
                </Link>
                .
              </p>
            )}
            {draftNotice === "error" && (
              <p className="mt-1 text-xs text-[var(--ink-faint)]">Couldn&apos;t draft an intro. Try again.</p>
            )}
          </div>
        )}
        <div className="flex items-end gap-2 rounded-full border border-[var(--border)] bg-[var(--canvas)] px-4 py-2">
          <textarea
            ref={textareaRef}
            name="content"
            rows={1}
            required
            maxLength={MAX}
            placeholder="Write a message"
            onInput={(e) => resizeTextarea(e.currentTarget)}
            className="max-h-32 min-h-[24px] flex-1 resize-none bg-transparent py-1 text-[15px] leading-relaxed text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)]"
          />
          <button
            type="submit"
            disabled={pending}
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
    </>
  );
}
