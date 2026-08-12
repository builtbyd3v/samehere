"use client";

import { useState } from "react";

// Source: https://www.beautifului.dev/ — adapted to SameHere recipe decisions.
const QUESTIONS = [
  {
    question: "Your first interview is scheduled. What should move first?",
    type: "radio" as const,
    options: ["Interview practice", "Keep applying", "One focused task"],
  },
  {
    question: "What changed since your last plan?",
    type: "check" as const,
    options: ["Interview booked", "Timeline moved", "Energy is lower"],
  },
  {
    question: "How should home feel this week?",
    type: "radio" as const,
    options: ["Prep Room", "Ops Desk", "Focus mode"],
  },
];

export default function ApprovalCard({ compact = false }: { compact?: boolean }) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number[]>>({});
  const [custom, setCustom] = useState<Record<number, string>>({});
  const [sent, setSent] = useState(false);
  const [open, setOpen] = useState(true);
  const questions = compact
    ? [{ ...QUESTIONS[0], options: QUESTIONS[0].options.slice(0, 2) }]
    : QUESTIONS;
  const question = questions[questionIndex];
  const last = questionIndex === questions.length - 1;
  const selected = answers[questionIndex] ?? [];
  const hasAnswer =
    selected.length > 0 || Boolean(custom[questionIndex]?.trim());

  const toggle = (index: number) => {
    setAnswers((current) => {
      const picked = current[questionIndex] ?? [];
      const next =
        question.type === "radio"
          ? [index]
          : picked.includes(index)
            ? picked.filter((item) => item !== index)
            : [...picked, index];
      return { ...current, [questionIndex]: next };
    });

    if (question.type === "radio") {
      setCustom((current) => ({ ...current, [questionIndex]: "" }));
      window.setTimeout(() => {
        if (questionIndex === questions.length - 1) setSent(true);
        else
          setQuestionIndex((current) =>
            Math.min(questions.length - 1, current + 1),
          );
      }, 480);
    }
  };

  const reset = () => {
    setQuestionIndex(0);
    setAnswers({});
    setCustom({});
    setSent(false);
    setOpen(true);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[12.5px] font-medium text-[var(--ink)] transition-colors duration-150 hover:bg-[var(--featured-surface)]"
      >
        Open approval
      </button>
    );
  }

  return (
    <div
      className={`flex w-full max-w-80 flex-col items-stretch ${
        compact ? "min-h-0" : "min-h-[196px]"
      }`}
    >
      <div className="w-full self-start overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)]">
        {sent ? (
          <div className="flex h-37 flex-col items-center justify-center gap-2">
            <span
              className="flex size-6 items-center justify-center rounded-full bg-[var(--accent-blue)] text-white"
              style={{
                animation:
                  "pop-in 300ms cubic-bezier(0.23,1,0.32,1) both",
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m20 6-11 11-5-5" />
              </svg>
            </span>
            <span
              className="text-[13px] font-medium text-[var(--ink)]"
              style={{
                animation:
                  "fade-up 350ms cubic-bezier(0.23,1,0.32,1) 100ms both",
              }}
            >
              Plan updated
            </span>
            <button
              type="button"
              onClick={reset}
              className="inline-flex min-h-11 items-center text-[12px] font-medium text-[var(--accent-blue-strong)] hover:underline"
            >
              Start over
            </button>
          </div>
        ) : (
          <div
            key={questionIndex}
            className="p-4"
            style={{
              animation:
                "fade-up 350ms cubic-bezier(0.23,1,0.32,1) both",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="text-[13px] font-medium text-[var(--ink)]">
                {question.question}
              </span>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => setOpen(false)}
                className="flex size-11 shrink-0 items-center justify-center rounded-lg text-[var(--ink-faint)] transition-colors duration-100 hover:bg-[var(--featured-surface)] hover:text-[var(--ink)]"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-2 flex flex-col gap-0.5">
              {question.options.map((option, index) => {
                const selectedOption = selected.includes(index);

                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={selectedOption}
                    onClick={() => toggle(index)}
                    className="-mx-1.5 flex min-h-11 items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors duration-100 hover:bg-[var(--featured-surface)]"
                  >
                    <span
                      className={`flex size-4 shrink-0 items-center justify-center transition-colors duration-200 ${
                        question.type === "radio"
                          ? "rounded-full"
                          : "rounded-[5px]"
                      } ${
                        selectedOption
                          ? "bg-[var(--ink)] text-[var(--canvas)]"
                          : "border border-[var(--border-strong)] text-transparent"
                      }`}
                    >
                      {question.type === "radio" ? (
                        <span
                          className="size-1.5 rounded-full bg-[var(--canvas)] transition-transform duration-200"
                          style={{
                            transform: selectedOption
                              ? "scale(1)"
                              : "scale(0)",
                          }}
                        />
                      ) : (
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="m20 6-11 11-5-5" />
                        </svg>
                      )}
                    </span>
                    <span
                      className={`text-[13px] transition-colors duration-200 ${
                        selectedOption
                          ? "text-[var(--ink)]"
                          : "text-[var(--ink-muted)]"
                      }`}
                    >
                      {option}
                    </span>
                  </button>
                );
              })}

              {!compact ? (
                <label className="-mx-1.5 flex min-h-11 items-center gap-2 rounded-lg px-1.5 py-1 transition-colors duration-100 focus-within:bg-[var(--featured-surface)] hover:bg-[var(--featured-surface)]">
                <span aria-hidden className="size-4 shrink-0" />
                <input
                  value={custom[questionIndex] ?? ""}
                  onChange={(event) => {
                    setCustom((current) => ({
                      ...current,
                      [questionIndex]: event.target.value,
                    }));
                    if (question.type === "radio")
                      setAnswers((current) => ({
                        ...current,
                        [questionIndex]: [],
                      }));
                  }}
                  placeholder="Type something…"
                  aria-label="Custom answer"
                  className="h-11 min-w-0 flex-1 bg-transparent text-[13px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)]"
                />
                </label>
              ) : null}
            </div>
          </div>
        )}

        {!compact ? (
          <div className="flex items-center justify-between border-t border-[var(--border)] px-3 py-2">
          <span className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Previous"
              disabled={questionIndex === 0 || sent}
              onClick={() =>
                setQuestionIndex((current) => Math.max(0, current - 1))
              }
              className="flex size-11 items-center justify-center rounded-[5px] text-[var(--ink-faint)] transition-colors duration-100 enabled:hover:bg-[var(--featured-surface)] enabled:hover:text-[var(--ink-muted)] disabled:opacity-35"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>

            <span className="flex items-center gap-1">
              {questions.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`Go to question ${index + 1}`}
                  aria-current={
                    index === questionIndex && !sent ? "step" : undefined
                  }
                  disabled={sent}
                  onClick={() => setQuestionIndex(index)}
                  className="flex size-11 items-center justify-center rounded-full disabled:cursor-default"
                >
                  <span
                    className="rounded-full transition-[width,height,border-color,background-color] duration-300"
                    style={
                      index === questionIndex && !sent
                        ? {
                            width: 9,
                            height: 9,
                            border: "2.5px solid var(--ink)",
                          }
                        : sent || index < questionIndex
                          ? {
                              width: 7,
                              height: 7,
                              background: "var(--ink-faint)",
                            }
                          : {
                              width: 7,
                              height: 7,
                              border: "1.5px solid var(--ink-faint)",
                            }
                    }
                  />
                </button>
              ))}
            </span>

            <button
              type="button"
              aria-label="Next"
              disabled={last || sent}
              onClick={() =>
                setQuestionIndex((current) =>
                  Math.min(questions.length - 1, current + 1),
                )
              }
              className="flex size-11 items-center justify-center rounded-[5px] text-[var(--ink-faint)] transition-colors duration-100 enabled:hover:bg-[var(--featured-surface)] enabled:hover:text-[var(--ink-muted)] disabled:opacity-35"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m9 6 6 6-6 6" />
              </svg>
            </button>
          </span>

          {!sent ? (
            <button
              type="button"
              aria-label={last ? "Send answers" : "Next question"}
              disabled={!hasAnswer}
              onClick={() =>
                last
                  ? setSent(true)
                  : setQuestionIndex((current) => current + 1)
              }
              className="flex size-11 min-h-11 min-w-11 items-center justify-center rounded-[8px] transition-[background-color,color,transform] duration-200 enabled:active:scale-[0.96]"
              style={{
                background: hasAnswer ? "var(--ink)" : "var(--featured-surface)",
                color: hasAnswer ? "var(--surface)" : "var(--ink-faint)",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
          ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
