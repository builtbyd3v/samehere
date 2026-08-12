"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { startPathTask } from "@/app/(app)/home/actions";

export default function PathTaskAction({
  taskId,
  href,
  status,
}: {
  taskId: string;
  href: string;
  status: "todo" | "doing";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function openTask() {
    setError(null);
    startTransition(async () => {
      if (status === "todo") {
        const result = await startPathTask(taskId);
        if (result.error) {
          setError(result.error);
          return;
        }
      }
      router.push(href);
    });
  }

  return (
    <div>
      <button type="button" className="btn-primary" disabled={pending} onClick={openTask}>
        {pending ? "Opening..." : status === "doing" ? "Continue" : "Start this move"}
      </button>
      {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
    </div>
  );
}
