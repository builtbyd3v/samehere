"use client";

import { useState } from "react";

export default function InterviewAnswerBox({
  companySlug,
  questionId,
}: {
  companySlug: string;
  questionId: string;
}) {
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!answer.trim()) return;
    setPending(true);
    setFeedback(null);

    // TODO: call interview_feedback (AI quota kind) with companySlug + questionId + answer
    await new Promise((r) => setTimeout(r, 250));
    setFeedback(
      `Feedback stub for ${companySlug}/${questionId} — AI coaching will land when interview_feedback is wired. Compare your answer to Approach and What they're evaluating above.`,
    );
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-3">
      <label className="block">
        <span className="text-sm font-medium text-[var(--ink)]">Your answer</span>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={5}
          placeholder="Write your approach or full answer here…"
          className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)] focus:border-[var(--border-strong)] focus:ring-2 focus:ring-[#3b82f6]/40"
        />
      </label>
      <button type="submit" className="btn-primary" disabled={pending || !answer.trim()}>
        {pending ? "Checking…" : "Get feedback"}
      </button>
      {feedback && (
        <p className="rounded-lg border border-[var(--border)] bg-[var(--featured-surface)] px-3 py-2 text-sm text-[var(--ink-muted)]">
          {feedback}
        </p>
      )}
    </form>
  );
}
