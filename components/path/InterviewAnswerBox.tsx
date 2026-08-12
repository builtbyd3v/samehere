"use client";

import Link from "next/link";
import { useState } from "react";
import { submitInterviewAnswer } from "@/app/(app)/prep/actions";

export default function InterviewAnswerBox({
  companySlug,
  questionId,
}: {
  companySlug: string;
  questionId: string;
}) {
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [overCap, setOverCap] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!answer.trim()) return;
    setPending(true);
    setFeedback(null);
    setOverCap(false);
    setError(null);

    const res = await submitInterviewAnswer({
      companySlug,
      questionId,
      answer,
    });

    if ("overCap" in res) {
      setOverCap(true);
    } else if ("error" in res) {
      setError(res.error);
    } else {
      setFeedback(res.feedback);
    }
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
      {overCap && (
        <p className="rounded-lg border border-[var(--border)] bg-[var(--featured-surface)] px-3 py-2 text-sm text-[var(--ink-muted)]">
          You&apos;ve used today&apos;s free interview feedback.{" "}
          <Link href="/pro" className="font-medium text-[var(--ink)] underline">
            Go Pro for more
          </Link>
          .
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </p>
      )}
      {feedback && (
        <pre className="whitespace-pre-wrap rounded-lg border border-[var(--border)] bg-[var(--featured-surface)] px-3 py-2 font-sans text-sm text-[var(--ink-muted)]">
          {feedback}
        </pre>
      )}
    </form>
  );
}
