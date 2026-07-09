"use client";

import { useState } from "react";
import { startDmWithUsername } from "@/app/(app)/messages/actions";
import FollowButton, { type FollowState } from "@/components/profile/FollowButton";
import Menu from "@/components/ui/Menu";
import Modal from "@/components/ui/Modal";
import { ReportForm } from "@/components/feed/ReportForm";
import { menuItemClass } from "@/lib/ui/menu-styles";

const btn =
  "inline-flex flex-1 items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition active:scale-[0.98] active:opacity-80 disabled:opacity-50 disabled:active:scale-100";

export default function ProfileActions({
  username,
  targetId,
  viewerId,
  followState,
  blocked,
  amIBlocking,
}: {
  username: string;
  targetId: string;
  viewerId: string;
  followState: FollowState;
  blocked: boolean;
  amIBlocking: boolean;
}) {
  const [reportOpen, setReportOpen] = useState(false);

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
    <>
      <div className="flex items-center gap-2">
        <FollowButton targetId={targetId} initial={followState} variant="pill" className="flex-1" />
        <form action={startDmWithUsername.bind(null, username)} className="flex flex-1">
          <button
            type="submit"
            className={`${btn} w-full border border-[var(--border-strong)] text-[var(--ink)] hover:bg-[var(--featured-surface)]`}
          >
            Message
          </button>
        </form>
        <Menu trigger={<span aria-hidden>⋯</span>} align="end">
          <button type="button" onClick={() => setReportOpen(true)} className={menuItemClass}>
            Report @{username}
          </button>
        </Menu>
      </div>

      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title="Report user">
        <ReportForm target={{ kind: "user", userId: targetId }} viewerId={viewerId} />
      </Modal>
    </>
  );
}
