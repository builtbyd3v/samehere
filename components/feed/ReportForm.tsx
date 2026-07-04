"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TEXT_LIMITS } from "@/lib/utils/validation";

const REASONS = ["Spam", "Harassment", "Hate speech", "Sexual content", "Self-harm", "Other"];

// Report form body — insert logic lives here once so PostMenu (the only
// caller now) doesn't duplicate it. Caller supplies its own Modal wrapper.
export function ReportForm({ postId, viewerId }: { postId: string; viewerId: string }) {
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) {
      setError("Pick a reason.");
      return;
    }
    setPending(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("reports")
      .insert({ post_id: postId, reporter_id: viewerId, reason, detail: detail.trim().slice(0, TEXT_LIMITS.reportDetail) || null });
    setPending(false);
    if (err) {
      setError("Couldn't submit. Try again.");
      return;
    }
    setDone(true);
  }

  if (done) return <p className="text-sm text-[var(--ink-muted)]">Thanks, we&apos;ll look into it.</p>;

  return (
    <form onSubmit={submit} className="space-y-3">
      <fieldset className="space-y-1.5">
        <legend className="sr-only">Reason</legend>
        {REASONS.map((r) => (
          <label key={r} className="flex items-center gap-2 text-sm text-[var(--ink)]">
            <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} />
            {r}
          </label>
        ))}
      </fieldset>
      <textarea
        value={detail}
        onChange={(e) => setDetail(e.target.value)}
        placeholder="Optional details"
        rows={3}
        maxLength={TEXT_LIMITS.reportDetail}
        className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)]"
      />
      {error && <p role="alert" className="text-sm text-[#c0392b] dark:text-[#e88]">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="btn-inset w-full rounded-md bg-[var(--ink)] px-4 py-1.5 text-sm font-medium text-[var(--canvas)] transition active:opacity-80 disabled:opacity-50"
      >
        {pending ? "Submitting…" : "Submit report"}
      </button>
    </form>
  );
}
