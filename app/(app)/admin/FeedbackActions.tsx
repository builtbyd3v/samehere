"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { resolveFeedback } from "./actions";

export default function FeedbackActions({ feedbackId }: { feedbackId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      className="btn-ghost !rounded-full !px-3 !py-1 !text-xs"
      onClick={() =>
        startTransition(async () => {
          try {
            await resolveFeedback(feedbackId);
            router.refresh();
          } catch (e) {
            alert(e instanceof Error ? e.message : "Action failed");
          }
        })
      }
    >
      Done
    </button>
  );
}
