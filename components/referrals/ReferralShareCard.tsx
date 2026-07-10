"use client";

import { useActionState, useState } from "react";
import posthog from "posthog-js";
import { updateReferralCode, type ReferralCodeState } from "@/app/(app)/referrals/actions";
import { IconBolt, IconButterfly } from "@/components/icons";

const GOAL = 100;
const BUTTERFLY_MILESTONE = 50;

export default function ReferralShareCard({
  initialCode,
  origin,
  referralCount,
  pendingCount,
  isCampusFounder,
}: {
  initialCode: string;
  origin: string;
  referralCount: number;
  pendingCount: number;
  isCampusFounder: boolean;
}) {
  const [state, formAction, pending] = useActionState<ReferralCodeState, FormData>(updateReferralCode, {});
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const code = state.code ?? initialCode;
  const shareLink = `${origin}/signup?ref=${code}`;

  const butterflyEarned = isCampusFounder || referralCount >= BUTTERFLY_MILESTONE;
  const proEarned = referralCount >= GOAL;
  const progress = Math.min(referralCount, GOAL);

  function copyLink() {
    navigator.clipboard.writeText(shareLink);
    posthog.capture("referral_link_copied", {
      referral_count: referralCount,
      is_campus_founder: isCampusFounder,
    });
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="card p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-[var(--ink-muted)]">Your referral code</p>
          <p className="mt-0.5 truncate text-lg font-semibold tracking-[-0.01em] text-[var(--ink)]">{code}</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="btn-ghost shrink-0 !rounded-full !px-4 !py-1.5 text-sm active:scale-[0.98]"
        >
          {editing ? "Cancel" : "Change"}
        </button>
      </div>

      {editing && (
        <form action={formAction} className="mt-3 flex gap-2">
          <input
            name="code"
            defaultValue={code}
            minLength={3}
            maxLength={20}
            required
            autoComplete="off"
            placeholder="yourcode"
            className="input-base flex-1 py-2 text-sm"
          />
          <button type="submit" disabled={pending} className="btn-primary shrink-0 !px-4 text-sm active:scale-[0.98]">
            {pending ? "Saving…" : "Save"}
          </button>
        </form>
      )}
      {state.error && (
        <p role="alert" className="mt-2 text-sm text-[var(--danger)]">
          {state.error}
        </p>
      )}

      <div className="mt-4 flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-3 py-2.5">
        <span className="min-w-0 flex-1 truncate text-sm text-[var(--ink-muted)]">{shareLink}</span>
        <button
          type="button"
          onClick={copyLink}
          className="btn-ghost shrink-0 !rounded-full !px-3 !py-1 text-sm active:scale-[0.98]"
        >
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>

      {/* Progress and milestones section */}
      <div className="mt-5 space-y-4">
        {/* Progress counter and bar */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-sm font-semibold text-[var(--ink)]">Progress</span>
            <span className="text-sm font-semibold text-[var(--ink)]">
              {progress} of {GOAL}
            </span>
          </div>

          {/* Progress bar with tick at 50% */}
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-[var(--featured-surface)]">
            <div
              className="h-full rounded-full bg-[var(--campus-founder)] transition-[width]"
              style={{ width: `${(progress / GOAL) * 100}%` }}
            />
            {/* Tick marker at 50% */}
            <div className="absolute top-0 h-full w-0.5 bg-[var(--ink-muted)] opacity-30" style={{ left: "50%" }} />
          </div>

          {/* Progress message */}
          <p className="mt-1.5 text-xs text-[var(--ink-muted)]">
            {proEarned
              ? "You have earned a free semester of Pro"
              : butterflyEarned
              ? `${Math.max(0, GOAL - referralCount)} more to a free semester of Pro`
              : `${Math.max(0, BUTTERFLY_MILESTONE - referralCount)} more to the Social Butterfly badge`}
          </p>
          {pendingCount > 0 && (
            <p className="mt-1 text-xs text-[var(--ink-muted)]">
              {pendingCount} pending. A referral counts once that person is active on samehere.
            </p>
          )}
        </div>

        {/* Milestone 1: Social Butterfly */}
        <div className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--canvas)] p-4">
          <IconButterfly className="h-9 w-9 shrink-0 text-[var(--campus-founder)]" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--ink)]">Social Butterfly badge</p>
            {butterflyEarned ? (
              <p className="mt-1 text-xs font-medium text-[var(--campus-founder)]">Earned at 50 referrals</p>
            ) : (
              <p className="mt-1 text-xs text-[var(--ink-muted)]">Reach 50 referrals</p>
            )}
          </div>
        </div>

        {/* Milestone 2: Free semester of Pro */}
        <div className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--canvas)] p-4">
          <IconBolt className="h-9 w-9 shrink-0 text-[var(--blue)]" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--ink)]">Free semester of Pro</p>
            {proEarned ? (
              <p className="mt-1 text-xs font-medium text-[var(--campus-founder)]">Earned. Applied to your account.</p>
            ) : (
              <p className="mt-1 text-xs text-[var(--ink-muted)]">Reach 100 referrals</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
