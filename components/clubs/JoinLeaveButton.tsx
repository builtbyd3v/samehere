"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { joinClub, leaveClub, updateClub, deleteClub, type ClubUpdate } from "@/app/(app)/community/clubs/actions";

type Status = "accepted" | "pending" | null;

// Reflects the viewer's membership state and drives it via the join/leave
// RPCs (wrapped in actions.ts). The label after a successful join comes from
// the RPC's own returned status -- open clubs resolve to 'accepted'
// immediately, closed ones to 'pending' -- rather than assuming `isOpen`
// always wins. Leaving is offered even to an owner; if they're the last
// owner, club_leave raises and the actions layer surfaces that as `error`.
export default function JoinLeaveButton({
  clubId,
  isOpen,
  initialStatus,
}: {
  clubId: string;
  isOpen: boolean;
  initialStatus: Status;
}) {
  const [status, setStatus] = useState<Status>(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleJoin() {
    setError(null);
    startTransition(async () => {
      const res = await joinClub(clubId);
      if (res.error) setError(res.error);
      else setStatus(res.status === "pending" ? "pending" : "accepted");
    });
  }

  function handleLeave() {
    setError(null);
    startTransition(async () => {
      const res = await leaveClub(clubId);
      if (res.error) setError(res.error);
      else setStatus(null);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {status === "accepted" ? (
        <button
          type="button"
          onClick={handleLeave}
          disabled={pending}
          className="btn-ghost px-4 py-1.5 text-sm"
        >
          {pending ? "…" : "Leave"}
        </button>
      ) : status === "pending" ? (
        <button
          type="button"
          onClick={handleLeave}
          disabled={pending}
          className="rounded-md border border-[var(--border)] px-4 py-1.5 text-sm font-medium text-[var(--ink-muted)] transition hover:bg-[var(--featured-surface)] active:scale-[0.98] active:opacity-80 disabled:opacity-50"
        >
          {pending ? "…" : "Cancel request"}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleJoin}
          disabled={pending}
          className="btn-primary px-4 py-1.5 text-sm"
        >
          {pending ? "…" : isOpen ? "Join" : "Request to join"}
        </button>
      )}
      {error && <p className="max-w-[16rem] text-right text-xs text-[var(--danger)]">{error}</p>}
    </div>
  );
}

// Owner-only header actions: edit the club's cosmetic fields, or delete it
// outright behind a ConfirmDialog. Lives alongside JoinLeaveButton (both are
// header-level membership/ownership actions) rather than a separate file.
export function ClubOwnerActions({
  club,
}: {
  club: { id: string; name: string; purpose: string; tags: string[]; is_open: boolean };
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(club.name);
  const [purpose, setPurpose] = useState(club.purpose);
  const [tags, setTags] = useState(club.tags.join(", "));
  const [isOpen, setIsOpen] = useState(club.is_open);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    // Name is just another field in the patch now -- the slug/route is fixed
    // at creation and never changes on rename.
    const patch: ClubUpdate = {
      name: name.trim(),
      purpose,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 5),
      is_open: isOpen,
    };
    startTransition(async () => {
      const res = await updateClub(club.id, patch);
      if (res.error) {
        setError(res.error);
        return;
      }
      setEditing(false);
    });
  }

  async function handleDelete() {
    const res = await deleteClub(club.id);
    if (res.error) setError(res.error);
    else router.push("/community");
  }

  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-[var(--border)] pt-3">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setEditing((e) => !e)}
          className="text-xs font-medium text-[var(--ink-muted)] transition hover:text-[var(--ink)] hover:underline"
        >
          {editing ? "Cancel edit" : "Edit club"}
        </button>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="text-xs font-medium text-[var(--danger)] hover:underline"
        >
          Delete club
        </button>
      </div>

      {editing && (
        <div className="flex flex-col gap-2 rounded-lg border border-[var(--border)] p-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm"
          />
          <textarea
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="Purpose"
            rows={3}
            className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm"
          />
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Tags, comma separated"
            className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm"
          />
          <label className="flex items-center gap-1.5 text-sm text-[var(--ink)]">
            <input type="checkbox" checked={isOpen} onChange={(e) => setIsOpen(e.target.checked)} />
            Open club (anyone can join without approval)
          </label>
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="btn-primary self-start px-3 py-1.5 text-sm"
          >
            {pending ? "…" : "Save changes"}
          </button>
        </div>
      )}

      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete club"
        message="Delete this club? This removes all members and announcements. This cannot be undone."
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}
