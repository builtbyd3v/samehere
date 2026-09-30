"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markStuckResolved, reopenStuck } from "@/app/(app)/post/[id]/actions";
import { Button, type ButtonVariant } from "@/components/ui/Button";

type StuckResolveButtonProps = {
  postId: string;
  commentId?: string;
  reopen?: boolean;
  label: string;
  variant?: ButtonVariant;
};

export default function StuckResolveButton({
  postId,
  commentId,
  reopen = false,
  label,
  variant = "ghost",
}: StuckResolveButtonProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <span className="inline-flex items-center gap-2">
      <Button
        variant={variant}
        size="sm"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = reopen ? await reopenStuck(postId) : await markStuckResolved(postId, commentId ?? null);
            if (result.error) setError(result.error);
            else router.refresh();
          });
        }}
      >
        {label}
      </Button>
      {error ? (
        <span role="alert" className="text-xs text-[var(--danger)]">
          {error}
        </span>
      ) : null}
    </span>
  );
}
