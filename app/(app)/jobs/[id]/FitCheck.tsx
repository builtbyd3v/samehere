"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { Skeleton } from "@/components/ui/Skeleton";
import { checkFit, type CheckFitResult } from "../actions";

function FitTag() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--blue-glow)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--blue)]">
      <svg aria-hidden viewBox="0 0 24 24" width="10" height="10" fill="currentColor">
        <path d="M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2Z" />
      </svg>
      Fit
    </span>
  );
}

function Reason({ reason, animate }: { reason: string; animate: boolean }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="mt-2 border-l-2 border-[var(--blue-glow)] pl-3"
      initial={animate && !reduce ? { opacity: 0, y: 16 } : undefined}
      animate={animate && !reduce ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <FitTag />
      <p className="mt-1.5 text-sm leading-relaxed text-[var(--ink-muted)]">{reason}</p>
    </motion.div>
  );
}

// Detail-page fit check: cached job_fit reason renders instantly (server-passed);
// otherwise one button runs checkFit() (same quota as Find my matches).
export default function FitCheck({
  listingId,
  initialReason,
}: {
  listingId: string;
  initialReason: string | null;
}) {
  const [state, setState] = useState<CheckFitResult | null>(
    initialReason ? { reason: initialReason } : null,
  );
  const [pending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      setState(await checkFit(listingId));
    });
  }

  if (state && "reason" in state) {
    return <Reason reason={state.reason} animate={!initialReason} />;
  }

  if (pending) return <Skeleton className="mt-2 h-5 w-3/4 rounded-md" />;

  return (
    <div className="mt-2">
      {state && "overCap" in state ? (
        <p className="text-sm text-[var(--ink-muted)]">
          You&apos;ve used today&apos;s free checks.{" "}
          <Link href="/pro" className="underline">
            Go Pro for 150 a day
          </Link>
        </p>
      ) : state && "none" in state ? (
        <p className="text-sm text-[var(--ink-muted)]">Not a strong match for your profile right now.</p>
      ) : state && "error" in state ? (
        <p className="text-sm text-[var(--danger)]">Couldn&apos;t check your fit. Try again.</p>
      ) : (
        <button
          type="button"
          onClick={run}
          className="inline-flex items-center gap-1 rounded-full bg-[var(--blue-glow)] px-3 py-1.5 text-sm font-medium text-[var(--blue)] transition hover:opacity-80"
        >
          <svg aria-hidden viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
            <path d="M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2Z" />
          </svg>
          Check my fit
        </button>
      )}
    </div>
  );
}
