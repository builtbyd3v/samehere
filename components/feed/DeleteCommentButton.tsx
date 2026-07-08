"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteComment } from "@/app/(app)/post/[id]/actions";

export default function DeleteCommentButton({ commentId, canDelete }: { commentId: string; canDelete: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!canDelete) return null;

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this comment?")) return;
        startTransition(async () => {
          await deleteComment(commentId);
          router.refresh();
        });
      }}
      className="text-xs text-[var(--ink-muted)] transition hover:text-[var(--danger)] active:scale-[0.97] disabled:opacity-50"
    >
      Delete
    </button>
  );
}
