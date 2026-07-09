"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { hidePost, unhidePost, resolveReport, suspendUser, unsuspendUser } from "./actions";

const btn =
  "rounded-full border border-[var(--border-strong)] px-3 py-1 text-xs font-medium text-[var(--ink)] transition hover:bg-[var(--featured-surface)] disabled:opacity-50";

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

  return (
    <div className="flex flex-wrap gap-2">
      {postId &&
        (postHidden ? (
          <button type="button" disabled={pending} className={btn} onClick={run(() => unhidePost(postId))}>
            Unhide post
          </button>
        ) : (
          <button type="button" disabled={pending} className={btn} onClick={run(() => hidePost(postId))}>
            Hide post
          </button>
        ))}
      {authorId &&
        (authorSuspended ? (
          <button type="button" disabled={pending} className={btn} onClick={run(() => unsuspendUser(authorId))}>
            Unsuspend author
          </button>
        ) : (
          <button type="button" disabled={pending} className={btn} onClick={run(() => suspendUser(authorId))}>
            Suspend author
          </button>
        ))}
      <button type="button" disabled={pending} className={btn} onClick={run(() => resolveReport(reportId))}>
        Dismiss report
      </button>
    </div>
  );
}
