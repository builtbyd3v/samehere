"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import posthog from "posthog-js";
import { IconBolt } from "@/components/icons";
import { Skeleton } from "@/components/ui/Skeleton";
import { tailorPitch } from "./actions";

// Per-listing tailored pitch (Pro). Free users see the Pro badge and an
// upsell link instead of a working button -- mirrors the improvePost
// lock pattern in feed/actions.ts.
// block: expanded pitch spans full width (detail page); off = compact
// max-w-xs panel for the tight jobs-board row.
export default function PitchButton({
  listingId,
  pro,
  block = false,
}: {
  listingId: string;
  pro: boolean;
  block?: boolean;
}) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const reduce = useReducedMotion();

  if (!pro) {
    return (
      <Link
        href="/pro"
        className="btn-accent"
      >
        <IconBolt className="h-3.5 w-3.5" />
        Tailor my pitch
      </Link>
    );
  }

  function run() {
    setError(false);
    startTransition(async () => {
      const res = await tailorPitch(listingId);
      if ("text" in res) setText(res.text);
      else setError(true);
      posthog.capture("job_pitch_generated", { outcome: "text" in res ? "success" : "locked" in res ? "locked" : "error" });
    });
  }

  async function copy() {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={text === null && !pending ? "" : block ? "w-full" : "max-w-xs"}>
      {pending ? (
        <div className="w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--canvas)] p-4 text-left">
          <div className="mb-3 flex items-center gap-1.5">
            <IconBolt className="h-3.5 w-3.5 text-[var(--blue)]" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="max-w-[64ch] space-y-1.5">
            <Skeleton className="h-[13.5px] w-full" />
            <Skeleton className="h-[13.5px] w-full" />
            <Skeleton className="h-[13.5px] w-4/5" />
          </div>
        </div>
      ) : text === null ? (
        <button
          type="button"
          onClick={run}
          disabled={pending}
          className="btn-accent"
        >
          <IconBolt className="h-3.5 w-3.5" />
          Tailor my pitch
        </button>
      ) : (
        <motion.div
          className="w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--canvas)] p-4 text-left"
          initial={reduce ? undefined : { opacity: 0, y: 8 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--ink-muted)]">
              <IconBolt className="h-3.5 w-3.5 text-[var(--blue)]" />
              Your tailored pitch
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={run}
                disabled={pending}
                className="rounded-md px-2 py-1 text-xs font-medium text-[var(--ink-muted)] transition hover:bg-[var(--featured-surface)] hover:text-[var(--ink)] disabled:opacity-60"
              >
                {pending ? "Regenerating…" : "Regenerate"}
              </button>
              <button
                type="button"
                onClick={copy}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[var(--blue)] transition hover:bg-[var(--blue-glow)]"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
          {/* Model output rendered as plain text only -- never dangerouslySetInnerHTML.
              Leading "- " lines become real bullets; blank lines become gaps. */}
          <div className="max-w-[64ch] space-y-1.5 text-[13.5px] leading-relaxed text-[var(--ink)]">
            {text.split("\n").map((line, i) => {
              const t = line.trim();
              if (!t) return <div key={i} className="h-1.5" aria-hidden />;
              if (/^[-•]\s*/.test(t)) {
                return (
                  <div key={i} className="flex gap-2">
                    <span className="select-none text-[var(--ink-faint)]">•</span>
                    <span>{t.replace(/^[-•]\s*/, "")}</span>
                  </div>
                );
              }
              return <p key={i}>{t}</p>;
            })}
          </div>
        </motion.div>
      )}
      {error && <p className="mt-1 text-xs text-[var(--danger)]">Couldn&apos;t generate a pitch. Try again.</p>}
    </div>
  );
}
