"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { IconBolt } from "@/components/icons";
import { tailorPitch } from "./actions";

// Per-listing tailored pitch (Pro). Free users see the Pro badge and an
// upsell link instead of a working button -- mirrors the improvePost
// lock pattern in feed/actions.ts.
export default function PitchButton({ listingId, pro }: { listingId: string; pro: boolean }) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const reduce = useReducedMotion();

  if (!pro) {
    return (
      <Link
        href="/pro"
        className="flex items-center gap-1 rounded-full bg-[var(--blue-glow)] px-3 py-1.5 text-sm font-medium text-[var(--blue)] transition hover:opacity-80"
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
    });
  }

  async function copy() {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="w-full max-w-xs text-right">
      {text === null && (
        <button
          type="button"
          onClick={run}
          disabled={pending}
          className="inline-flex items-center gap-1 rounded-full bg-[var(--blue-glow)] px-3 py-1.5 text-sm font-medium text-[var(--blue)] transition hover:opacity-80 disabled:opacity-60"
        >
          <IconBolt className="h-3.5 w-3.5" />
          {pending ? "Tailoring…" : "Tailor my pitch"}
        </button>
      )}
      <AnimatePresence>
        {text !== null && (
          <motion.div
            className="mt-2 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--canvas)] p-3 text-left text-sm"
            initial={reduce ? undefined : { opacity: 0, y: 8 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: 8 }}
            transition={{ duration: 0.3 }}
          >
            {/* Model output rendered as plain text only -- never dangerouslySetInnerHTML. */}
            <p className="whitespace-pre-wrap text-[var(--ink)]">{text}</p>
            <button type="button" onClick={copy} className="mt-2 text-xs font-medium text-[var(--blue)] underline">
              {copied ? "Copied" : "Copy"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      {error && <p className="mt-1 text-xs text-[var(--danger)]">Couldn&apos;t generate a pitch. Try again.</p>}
    </div>
  );
}
