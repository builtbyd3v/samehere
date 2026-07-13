"use client";

import { useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { createComment, type CommentState } from "@/app/(app)/post/[id]/actions";
import { useSubmitShortcut } from "@/lib/useSubmitShortcut";
import { submitShortcutLabel } from "@/lib/keyboard";
import { TEXT_LIMITS } from "@/lib/utils/validation";
import MentionTextarea from "@/components/ui/MentionTextarea";
import type { Comment, CommentAuthor } from "./comment-types";

const POINT_AT = 50; // ponytail: mirrors comments_award_contribution comment threshold
const AWARD = 3; // ponytail: mirrors comments_award_contribution comment points
const MAX = TEXT_LIMITS.comment;

type Props = {
  postId?: string;
  // Below three are optional so this composer still works standalone
  // (no viewer/callback -> no optimistic row, just the existing wait-for-server
  // behavior). CommentThread always passes them.
  viewerId?: string | null;
  viewer?: CommentAuthor | null;
  onOptimisticAdd?: (comment: Comment) => void;
};

export default function CommentComposer({ postId, viewerId, viewer, onOptimisticAdd }: Props) {
  const [state, formAction, pending] = useActionState<CommentState, FormData>(createComment, {});
  const [, startSubmit] = useTransition();
  const ref = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [content, setContent] = useState("");
  const [len, setLen] = useState(0);
  const [shortcutLabel, setShortcutLabel] = useState("");
  // Text that was in flight when we cleared the box optimistically — restored
  // if the server action comes back with an error.
  const lastSubmitted = useRef("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- navigator-based label deferred to post-hydration to avoid an SSR/client mismatch
    setShortcutLabel(submitShortcutLabel());
  }, []);

  useEffect(() => {
    if (state.ok) {
      ref.current?.reset();
    }
    if (state.error) {
      // Reacts to useActionState completion (no synchronous onError in React
      // 19's action model); restores the text an optimistic submit already
      // cleared.
      setContent(lastSubmitted.current);
      setLen(lastSubmitted.current.trim().length);
    }
  }, [state]);

  const submit = useCallback(() => {
    if (!ref.current || pending || len === 0) return;
    const formData = new FormData(ref.current);
    lastSubmitted.current = content;

    // Clear + render the optimistic row immediately; both must be inside the
    // same transition as the action call or React rejects the optimistic
    // update (and it wouldn't revert in sync with the revalidated list).
    setContent("");
    setLen(0);
    startSubmit(() => {
      if (viewer && viewerId) {
        onOptimisticAdd?.({
          id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          content,
          created_at: new Date().toISOString(),
          user_id: viewerId,
          author: viewer,
          pending: true,
        });
      }
      formAction(formData);
    });
  }, [content, formAction, len, onOptimisticAdd, pending, viewer, viewerId]);

  useSubmitShortcut(textareaRef, submit, !pending && len > 0);

  const qualifies = len >= POINT_AT;

  return (
    <form
      ref={ref}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="rounded-xl border border-[var(--border)] bg-[var(--canvas)] p-4 transition-colors focus-within:border-[var(--border-strong)]"
    >
      <input type="hidden" name="post_id" value={postId ?? ""} />
      <MentionTextarea
        textareaRef={textareaRef}
        name="content"
        rows={3}
        required
        maxLength={MAX}
        value={content}
        onChange={(v) => {
          setContent(v);
          setLen(v.trim().length);
        }}
        placeholder={
          shortcutLabel
            ? `Add a comment… Type @ to mention (${shortcutLabel} to post)`
            : "Add a comment… Type @ to mention"
        }
        className="w-full resize-y bg-transparent text-[15px] leading-relaxed text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)]"
      />

      {state.error && (
        <p role="alert" className="mt-2 text-sm text-[var(--danger)]">
          {state.error}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-3">
        <span
          className={`text-xs transition-colors duration-300 motion-reduce:transition-none ${
            len >= MAX ? "text-[var(--danger)]" : qualifies ? "text-[var(--blue)]" : "text-[var(--ink-muted)]"
          }`}
        >
          {len === 0
            ? `${POINT_AT}+ characters earns +${AWARD} points`
            : len >= MAX
              ? `${len}/${MAX}`
              : qualifies
                ? `+${AWARD} points earned`
                : `${POINT_AT - len} more characters to earn +${AWARD} points`}
        </span>
        <button type="submit" disabled={pending || len === 0 || len > MAX} className="btn-primary">
          {pending ? "Posting…" : "Comment"}
        </button>
      </div>
    </form>
  );
}
