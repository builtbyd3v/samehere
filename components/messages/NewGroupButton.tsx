"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  listFollowedForGroup,
  createGroupConversation,
  type MessageUserResult,
} from "@/app/(app)/messages/actions";
import { IconCommunity } from "@/components/icons";
import { TEXT_LIMITS, textLimitError } from "@/lib/utils/validation";
import AvatarImage from "@/components/ui/AvatarImage";

const MAX_MEMBERS = 10;

export default function NewGroupButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [candidates, setCandidates] = useState<MessageUserResult[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    listFollowedForGroup().then(setCandidates);
  }, [open]);

  function close() {
    setOpen(false);
    setSelected(new Set());
    setTitle("");
    setError(null);
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_MEMBERS - 1) {
        next.add(id);
      }
      return next;
    });
  }

  function submit() {
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Give the group a name.");
      return;
    }
    const limitErr = textLimitError("Group name", TEXT_LIMITS.groupTitle, trimmed.length);
    if (limitErr) {
      setError(limitErr);
      return;
    }
    if (selected.size === 0) {
      setError("Pick at least one person.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createGroupConversation(trimmed, Array.from(selected));
      if ("error" in result) {
        setError(result.error);
        return;
      }
      close();
      router.push(`/messages/${result.conversationId}`);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 border-b border-[var(--border)] px-4 py-3.5 text-left text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--featured-surface)]"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full border border-[var(--border)] bg-[var(--canvas)] text-[var(--ink-muted)]">
          <IconCommunity className="h-4 w-4" />
        </span>
        New group
      </button>
    );
  }

  return (
    <div className="border-b border-[var(--border)] px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Group name"
          maxLength={TEXT_LIMITS.groupTitle}
          className="min-w-0 flex-1 bg-transparent text-[15px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)]"
        />
        <button type="button" onClick={close} className="shrink-0 text-sm text-[var(--ink-muted)] hover:text-[var(--ink)]">
          Cancel
        </button>
      </div>

      <ul className="mt-2 max-h-52 overflow-y-auto">
        {candidates.length === 0 && (
          <li className="py-3 text-sm text-[var(--ink-muted)]">Follow some students to start a group.</li>
        )}
        {candidates.map((u) => {
          const name = u.display_name ?? u.username;
          const checked = selected.has(u.id);
          return (
            <li key={u.id}>
              <label className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-1 py-2 text-left transition hover:bg-[var(--featured-surface)]">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(u.id)}
                  className="h-4 w-4 shrink-0"
                />
                {u.avatar_url ? (
                  <AvatarImage src={u.avatar_url} alt="" className="h-9 w-9 rounded-full border border-[var(--border)] object-cover" pro={u.is_pro} />
                ) : (
                  <div className="grid h-9 w-9 place-items-center rounded-full border border-[var(--border)] bg-[var(--featured-surface)] text-xs font-semibold text-[var(--ink-muted)]">
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="min-w-0 text-sm">
                  <span className="font-medium text-[var(--ink)]">{name}</span>
                  <span className="ml-1.5 text-[var(--ink-muted)]">@{u.username}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      {error && <p className="mt-1 text-xs text-[var(--danger)]">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="btn-inset mt-2 w-full rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-medium text-[var(--canvas)] disabled:opacity-50"
      >
        {pending ? "Creating…" : `Create group${selected.size ? ` (${selected.size + 1})` : ""}`}
      </button>
    </div>
  );
}
