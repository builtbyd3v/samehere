"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { startPathTask } from "@/app/(app)/home/actions";
import { LoadingButton } from "@/components/interior/LoadingButton";

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
  const [error, setError] = useState<string | null>(null);

  async function openTask() {
    setError(null);
    if (status === "todo") {
      const result = await startPathTask(taskId);
      if (result.error) {
        throw new Error(result.error);
      }
    }
    router.push(href);
  }

  return (
    <div>
      <LoadingButton
        onAction={openTask}
        pendingLabel="Opening"
        successLabel="Opened"
        errorLabel="Try again"
        onError={(cause) => {
          setError(cause instanceof Error ? cause.message : "Could not open this move.");
        }}
      >
        {status === "doing" ? "Continue" : "Start this move"}
      </LoadingButton>
      {error ? <p className="mt-2 text-sm text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}
