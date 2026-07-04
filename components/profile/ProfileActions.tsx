"use client";

import { startDmWithUsername } from "@/app/(app)/messages/actions";
import FollowButton, { type FollowState } from "@/components/profile/FollowButton";

const btn =
  "inline-flex flex-1 items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition active:opacity-80 disabled:opacity-50";

export default function ProfileActions({
  username,
  targetId,
  followState,
  blocked,
  amIBlocking,
}: {
  username: string;
  targetId: string;
  followState: FollowState;
  blocked: boolean;
  amIBlocking: boolean;
}) {
  if (blocked && !amIBlocking) {
    return (
      <p className="text-center text-sm text-[var(--ink-muted)]">You can&apos;t interact with this user.</p>
    );
  }

  if (blocked && amIBlocking) {
    return (
      <p className="text-center text-sm text-[var(--ink-muted)]">You blocked this user.</p>
    );
  }

  return (
    <div className="flex gap-2">
      <FollowButton targetId={targetId} initial={followState} variant="pill" className="flex-1" />
      <form action={startDmWithUsername.bind(null, username)} className="flex flex-1">
        <button
          type="submit"
          className={`${btn} w-full border border-[var(--border-strong)] text-[var(--ink)] hover:bg-[var(--featured-surface)]`}
        >
          Message
        </button>
      </form>
    </div>
  );
}
