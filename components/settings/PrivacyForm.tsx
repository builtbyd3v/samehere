"use client";

import { useActionState } from "react";
import { updatePrivacy, type PrivacyState } from "@/app/(app)/settings/actions";
import Select from "@/components/ui/Select";

const HEATMAP_OPTIONS = [
  { value: "public", label: "Everyone" },
  { value: "followers", label: "Followers only" },
];

const label = "block text-sm font-medium text-[var(--ink)]";
const field = "input-base mt-1.5";

export type PrivacyInitial = {
  is_private: boolean;
  hide_school: boolean;
  heatmap_visibility: string;
  leaderboard_opt_out: boolean;
  email_digest_opt_out: boolean;
};

export default function PrivacyForm({ initial }: { initial: PrivacyInitial }) {
  const [state, formAction, pending] = useActionState<PrivacyState, FormData>(updatePrivacy, {});

  return (
    <form action={formAction} className="space-y-3">
      {state.error && (
        <p role="alert" className="rounded-md border border-[var(--border-strong)] px-3 py-2 text-sm text-[var(--ink)]">
          {state.error}
        </p>
      )}
      {state.success && <p className="text-sm text-[var(--ink-muted)]">Saved.</p>}

      <label className="flex items-center gap-2.5 text-sm text-[var(--ink)]">
        <input type="checkbox" name="is_private" defaultChecked={initial.is_private} className="h-4 w-4 accent-[var(--ink)]" />
        <span>Private account <span className="text-[var(--ink-muted)]">, require approval to follow</span></span>
      </label>
      <label className="flex items-center gap-2.5 text-sm text-[var(--ink)]">
        <input type="checkbox" name="hide_school" defaultChecked={initial.hide_school} className="h-4 w-4 accent-[var(--ink)]" />
        <span>Hide school <span className="text-[var(--ink-muted)]">, from people who don&apos;t follow you</span></span>
      </label>
      <label className="flex items-center gap-2.5 text-sm text-[var(--ink)]">
        <input type="checkbox" name="show_on_leaderboard" defaultChecked={!initial.leaderboard_opt_out} className="h-4 w-4 accent-[var(--ink)]" />
        <span>Show me on leaderboards</span>
      </label>
      <label className="flex items-center gap-2.5 text-sm text-[var(--ink)]">
        <input type="checkbox" name="daily_digest_email" defaultChecked={!initial.email_digest_opt_out} className="h-4 w-4 accent-[var(--ink)]" />
        <span>Daily unread-activity email <span className="text-[var(--ink-muted)]">, only sent when you have something unread</span></span>
      </label>
      <div>
        <label className={label}>Heatmap visibility</label>
        <Select
          options={HEATMAP_OPTIONS}
          name="heatmap_visibility"
          defaultValue={initial.heatmap_visibility}
          ariaLabel="Heatmap visibility"
          className="mt-1.5 w-full"
        />
      </div>

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Saving…" : "Save privacy settings"}
      </button>
    </form>
  );
}
