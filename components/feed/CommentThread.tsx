"use client";

import { useOptimistic } from "react";
import CommentComposer from "./CommentComposer";
import DeleteCommentButton from "./DeleteCommentButton";
import UserBadges from "@/components/profile/UserBadges";
import AvatarBase from "@/components/ui/Avatar";
import MentionText from "@/components/ui/MentionText";
import ProfileHoverLink from "@/components/profile/ProfileHoverLink";
import type { Comment, CommentAuthor } from "./comment-types";

// Thin client wrapper around the (still server-fetched) comment list, so a
// posted comment can render before the createComment server action +
// revalidatePath round-trip resolves. Plan 039: mirrors ReactionRow's
// optimistic+rollback, adapted for a server-rendered list instead of local
// client state.
//
// No manual reconcile step: Next batches the revalidated RSC payload into the
// same transition that carries the server action call (see CommentComposer's
// submit), so by the time that transition settles, `initialComments` already
// contains the real row and useOptimistic reverts to it automatically — same
// path on success or on error (no revalidatePath -> reverts to the unchanged
// base list, so the temp row just disappears with no extra removal code).
export default function CommentThread({
  postId,
  initialComments,
  viewerId,
  viewer,
}: {
  postId: string;
  initialComments: Comment[];
  viewerId: string | null;
  viewer: CommentAuthor | null;
}) {
  const [comments, addOptimisticComment] = useOptimistic(
    initialComments,
    (state, newComment: Comment) => [...state, newComment],
  );

  return (
    <>
      <h2 className="mb-4 text-sm font-semibold text-[var(--ink)]">
        {comments.length > 0 ? `${comments.length} comments` : "Comments"}
      </h2>

      <CommentComposer
        postId={postId}
        viewerId={viewerId}
        viewer={viewer}
        onOptimisticAdd={addOptimisticComment}
      />

      <div className="mt-6 space-y-5">
        {comments.map((c) => {
          const cname = c.author?.display_name ?? c.author?.username ?? "Unknown";
          return (
            <div
              key={c.id}
              className={`flex gap-3 transition-opacity motion-reduce:transition-none ${c.pending ? "opacity-60" : ""}`}
            >
              {c.author ? (
                <ProfileHoverLink
                  href={`/profile/${c.author.username}`}
                  username={c.author.username}
                  className="shrink-0"
                >
                  <AvatarBase src={c.author.avatar_url} seed={c.author.username} name={cname} className="h-8 w-8 rounded-full border border-[var(--border)] text-xs" pro={c.author.is_pro ?? false} />
                </ProfileHoverLink>
              ) : (
                <AvatarBase src={null} seed={cname} name={cname} className="h-8 w-8 shrink-0 rounded-full border border-[var(--border)] text-xs" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-1.5 text-sm">
                  {c.author ? (
                    <ProfileHoverLink
                      href={`/profile/${c.author.username}`}
                      username={c.author.username}
                      className="font-medium hover:underline"
                    >
                      {cname}
                    </ProfileHoverLink>
                  ) : (
                    <span className="font-medium">{cname}</span>
                  )}
                  {c.author && <UserBadges isPro={c.author.is_pro} isFounder={c.author.is_founder} isCampusFounder={c.author.is_campus_founder} isVerifiedStudent={c.author.verified_student} />}
                  {c.author && <span className="text-[var(--ink-muted)]">@{c.author.username}</span>}
                  <div className="ml-auto">
                    {!c.pending && <DeleteCommentButton commentId={c.id} canDelete={viewerId === c.user_id} />}
                  </div>
                </div>
                <p className="mt-0.5 whitespace-pre-line break-words text-[15px] leading-[1.55]">
                  <MentionText>{c.content}</MentionText>
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
