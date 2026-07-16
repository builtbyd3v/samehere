"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { hidePost, unhidePost, resolveReport, suspendUser, unsuspendUser, deletePost } from "./actions";

const btnGhost = "btn-ghost !rounded-full !px-3 !py-1 !text-xs";
const btnDanger = "btn-danger !rounded-full !px-3 !py-1 !text-xs";

export default function ReportActions({
  reportId,
  postId,
  authorId,
  postHidden,
  authorSuspended,
}: {
  reportId: string;
  /** null for user/message reports — there is no post to hide. */
  postId: string | null;
  authorId: string | null;
  postHidden: boolean;
  authorSuspended: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const router = useRouter();

  const run = (fn: () => Promise<void>) => () =>
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Action failed");
      }
    });

  // Irreversible, so this needs an explicit second click before it fires.
  // window.confirm is a blocking browser modal -- avoided per house style --
  // so the button itself flips to a "Confirm delete" state instead.
  const handleDeleteClick = () => {
    if (!postId) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setConfirmingDelete(false);
    run(() => deletePost(postId))();
  };

  return (
    <div className="flex flex-wrap gap-2">
      {postId &&
        (postHidden ? (
          <button type="button" disabled={pending} className={btnGhost} onClick={run(() => unhidePost(postId))}>
            Unhide post
          </button>
        ) : (
          <button type="button" disabled={pending} className={btnDanger} onClick={run(() => hidePost(postId))}>
            Hide post
          </button>
        ))}
      {postId && (
        <button type="button" disabled={pending} className={btnDanger} onClick={handleDeleteClick}>
          {confirmingDelete ? "Confirm delete" : "Delete post"}
        </button>
      )}
      {authorId &&
        (authorSuspended ? (
          <button type="button" disabled={pending} className={btnGhost} onClick={run(() => unsuspendUser(authorId))}>
            Unsuspend author
          </button>
        ) : (
          <button type="button" disabled={pending} className={btnDanger} onClick={run(() => suspendUser(authorId, postId))}>
            Suspend author
          </button>
        ))}
      <button type="button" disabled={pending} className={btnGhost} onClick={run(() => resolveReport(reportId))}>
        Dismiss report
      </button>
    </div>
  );
}
