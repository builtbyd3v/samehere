"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TEXT_LIMITS } from "@/lib/utils/validation";

const REASONS = ["Spam", "Harassment", "Hate speech", "Sexual content", "Self-harm", "Other"];

/** What is being reported. One target column is set per report (DB CHECK). */
export type ReportTarget =
  | { kind: "post"; postId: string }
  | { kind: "user"; userId: string }
  | { kind: "message"; messageId: string };

// Report form body — insert logic lives here once so every caller (post menu,
// profile header, DM thread) shares it. Caller supplies its own Modal wrapper.
export function ReportForm({
  target,
  viewerId,
  context,
}: {
  target: ReportTarget;
  viewerId: string;
  /** Prepended to optional details — e.g. quote repost being reported. */
  context?: string;
}) {
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
    const detailParts = [context?.trim(), detail.trim()].filter(Boolean);
    const targetCol =
      target.kind === "post"
        ? { post_id: target.postId }
        : target.kind === "user"
          ? { reported_user_id: target.userId }
          : { message_id: target.messageId };
    // snapshot is captured server-side by the reports_assert_target trigger —
    // never sent from here (a client-supplied snapshot would be forgeable, and
    // it's the only evidence left once ON DELETE SET NULL nulls the target).
    const { error: err } = await supabase.from("reports").insert({
      ...targetCol,
      target_type: target.kind,
      reporter_id: viewerId,
      reason,
      detail: detailParts.length ? detailParts.join("\n\n").slice(0, TEXT_LIMITS.reportDetail) : null,
    });
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
      {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Submitting…" : "Submit report"}
      </button>
    </form>
  );
}
