"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePost } from "@/app/(app)/feed/actions";

export default function DeletePostButton({ postId, canDelete }: { postId: string; canDelete: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!canDelete) return null;

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this post?")) return;
        startTransition(async () => {
          await deletePost(postId);
          router.refresh();
        });
      }}
      className="text-xs text-[var(--ink-muted)] hover:text-[#c0392b] disabled:opacity-50"
    >
      Delete
    </button>
  );
}
