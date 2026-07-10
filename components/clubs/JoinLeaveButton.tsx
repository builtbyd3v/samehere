"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { joinClub, leaveClub, updateClub, renameClub, deleteClub, type ClubUpdate } from "@/app/(app)/community/clubs/actions";

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
          className="rounded-md border border-[var(--border-strong)] px-4 py-1.5 text-sm font-medium transition hover:bg-[var(--featured-surface)] active:scale-[0.98] active:opacity-80 disabled:opacity-50"
        >
          {pending ? "…" : "Leave"}
        </button>
      ) : status === "pending" ? (
        <button
          type="button"
          disabled
          className="rounded-md border border-[var(--border)] px-4 py-1.5 text-sm font-medium text-[var(--ink-muted)] opacity-70"
        >
          Requested
        </button>
      ) : (
        <button
          type="button"
          onClick={handleJoin}
          disabled={pending}
          className="btn-inset rounded-md bg-[var(--ink)] px-4 py-1.5 text-sm font-medium text-[var(--canvas)] transition active:scale-[0.98] active:opacity-80 disabled:opacity-50"
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
    const patch: ClubUpdate = {
      purpose,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 5),
      is_open: isOpen,
    };
    const nameChanged = name.trim() !== club.name;
    startTransition(async () => {
      // Name changes go through renameClub -- it regenerates the slug so the
      // route follows the name, then we redirect to the new slug. Cosmetic
      // fields go through updateClub (slug is frozen for those).
      const res = await updateClub(club.id, patch);
      if (res.error) {
        setError(res.error);
        return;
      }
      if (nameChanged) {
        const r = await renameClub(club.id, name.trim());
        if (r.error) {
          setError(r.error);
          return;
        }
        setEditing(false);
        if (r.slug) router.push(`/community/clubs/${r.slug}`);
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
            className="btn-inset self-start rounded-md bg-[var(--ink)] px-3 py-1.5 text-sm font-medium text-[var(--canvas)] disabled:opacity-50"
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
