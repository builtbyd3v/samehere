"use client";

import { useActionState, useState } from "react";
import posthog from "posthog-js";
import { updateReferralCode, type ReferralCodeState } from "@/app/(app)/referrals/actions";
import { IconGradCap } from "@/components/icons";

const GOAL = 100;

export default function ReferralShareCard({
  initialCode,
  origin,
  referralCount,
  isCampusFounder,
}: {
  initialCode: string;
  origin: string;
  referralCount: number;
  isCampusFounder: boolean;
}) {
  const [state, formAction, pending] = useActionState<ReferralCodeState, FormData>(updateReferralCode, {});
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const code = state.code ?? initialCode;
  const shareLink = `${origin}/signup?ref=${code}`;

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

      <div className="mt-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--ink)]">Referrals</span>
          <span className="font-semibold text-[var(--ink)]">{referralCount}</span>
        </div>
        {isCampusFounder ? (
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <IconGradCap className="h-5 w-5 text-[var(--campus-founder)]" />
              <span className="text-sm font-semibold text-[var(--ink)]">Campus Founder</span>
            </div>
            <p className="mt-1 text-xs text-[var(--ink-muted)]">Earned — thanks for growing samehere.</p>
          </div>
        ) : (
          <>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--featured-surface)]">
              <div
                className="h-full rounded-full bg-[var(--campus-founder)] transition-[width]"
                style={{ width: `${Math.min(100, (referralCount / GOAL) * 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-[var(--ink-muted)]">
              {Math.max(0, GOAL - referralCount)} more to Campus Founder
            </p>
          </>
        )}
      </div>
    </div>
  );
}
