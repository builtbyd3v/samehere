"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import AvatarImage from "@/components/ui/AvatarImage";
import UserBadges from "@/components/profile/UserBadges";
import RoleControls from "./RoleControls";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { approveMember, rejectMember, kickMember, banMember } from "@/app/(app)/community/clubs/actions";

export type ClubMemberProfile = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_pro: boolean;
  is_founder: boolean;
  is_campus_founder: boolean;
  verified_student: boolean;
};

// Member-row idiom (avatar-or-initial + name + badges + @username), extended
// with role/title text and, conditionally, approve/reject (pending rows,
// owner|officer) or RoleControls (accepted rows, owner only). RLS is the real
// gate on both actions -- canManage/isOwnerViewer only decide what renders.
export default function MemberRow({
  clubId,
  userId,
  role,
  title,
  profile,
  pending,
  canManage,
  isOwnerViewer,
  viewerId,
}: {
  clubId: string;
  userId: string;
  role: string;
  title: string | null;
  profile: ClubMemberProfile | null;
  pending?: boolean;
  canManage: boolean;
  isOwnerViewer: boolean;
  viewerId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kickOpen, setKickOpen] = useState(false);
  const [banOpen, setBanOpen] = useState(false);
  const [modPending, startModTransition] = useTransition();
  const name = profile?.display_name ?? profile?.username ?? "Unknown";

  // Owner can kick/ban members and officers; officer can only kick/ban
  // members. Nobody can act on an owner, or on themselves. club_kick/
  // club_ban (RLS) are the real gate -- this only decides what renders.
  const canModerate =
    canManage && !pending && role !== "owner" && userId !== viewerId && (role !== "officer" || isOwnerViewer);

  async function act(approve: boolean) {
    setBusy(true);
    setError(null);
    const res = await (approve ? approveMember(clubId, userId) : rejectMember(clubId, userId));
    setBusy(false);
    if (res.error) setError(res.error);
    else router.refresh();
  }

  function kick() {
    setError(null);
    startModTransition(async () => {
      const res = await kickMember(clubId, userId);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  function ban() {
    setError(null);
    startModTransition(async () => {
      const res = await banMember(clubId, userId);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--canvas)] p-3">
      {profile?.avatar_url ? (
        <AvatarImage
          src={profile.avatar_url}
          alt=""
          className="h-9 w-9 shrink-0 rounded-full border border-[var(--border)] object-cover"
          pro={profile.is_pro}
        />
      ) : (
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-sm font-semibold text-[var(--ink-muted)]">
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1 text-sm">
        <div className="flex flex-wrap items-center gap-x-1.5">
          {profile ? (
            <Link href={`/profile/${profile.username}`} className="font-medium hover:underline">
              {name}
            </Link>
          ) : (
            <span className="font-medium">{name}</span>
          )}
          {profile && (
            <UserBadges
              isPro={profile.is_pro}
              isFounder={profile.is_founder}
              isCampusFounder={profile.is_campus_founder}
              isVerifiedStudent={profile.verified_student}
            />
          )}
          {profile && <span className="text-[var(--ink-muted)]">@{profile.username}</span>}
        </div>
        <p className="text-xs capitalize text-[var(--ink-muted)]">
          {role}
          {title ? ` · ${title}` : ""}
        </p>
        {error && <p className="mt-1 text-xs text-[var(--danger)]">{error}</p>}
      </div>

      {pending && canManage && (
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => act(true)}
            disabled={busy}
            className="btn-primary px-3 py-1.5 text-sm"
          >
            {busy ? "…" : "Approve"}
          </button>
          <button
            type="button"
            onClick={() => act(false)}
            disabled={busy}
            className="btn-ghost px-3 py-1.5 text-sm"
          >
            Reject
          </button>
        </div>
      )}

      {!pending && isOwnerViewer && (
        <RoleControls clubId={clubId} userId={userId} role={role} title={title} />
      )}

      {canModerate && (
        <div className="flex shrink-0 items-center gap-3 text-xs font-medium">
          <button
            type="button"
            onClick={() => setKickOpen(true)}
            disabled={modPending}
            className="text-[var(--ink-muted)] transition hover:text-[var(--ink)] hover:underline disabled:opacity-50"
          >
            Remove
          </button>
          <button
            type="button"
            onClick={() => setBanOpen(true)}
            disabled={modPending}
            className="text-[var(--danger)] transition hover:underline disabled:opacity-50"
          >
            Ban
          </button>
        </div>
      )}

      <ConfirmDialog
        open={kickOpen}
        onClose={() => setKickOpen(false)}
        onConfirm={kick}
        title="Remove member?"
        message={`${name} will be removed from this club.`}
        confirmLabel="Remove"
        destructive
      />

      <ConfirmDialog
        open={banOpen}
        onClose={() => setBanOpen(false)}
        onConfirm={ban}
        title="Ban member?"
        message={`${name} will be removed and won't be able to rejoin this club.`}
        confirmLabel="Ban"
        destructive
      />
    </div>
  );
}
