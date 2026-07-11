"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Menu from "@/components/ui/Menu";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import AvatarImage from "@/components/ui/AvatarImage";
import { menuItemClass, menuDangerClass } from "@/lib/ui/menu-styles";
import {
  addGroupMember,
  removeGroupMember,
  leaveConversation,
  listFollowedForGroup,
  type MessageUserResult,
} from "@/app/(app)/messages/actions";
import type { GroupMember } from "@/lib/messages";

// Group-thread control: manage members (add / creator-only remove) + leave.
// Separate from DmThreadMenu (which only ever offered "Leave conversation")
// rather than teaching that shared component two conversation shapes --
// GroupThreadHeader renders this instead of DmThreadMenu for groups.
export default function GroupManage({
  conversationId,
  members,
  createdBy,
  isCreator,
}: {
  conversationId: string;
  members: GroupMember[];
  createdBy: string | null;
  isCreator: boolean;
}) {
  const router = useRouter();
  const [manageOpen, setManageOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [candidates, setCandidates] = useState<MessageUserResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!manageOpen) return;
    listFollowedForGroup().then(setCandidates);
  }, [manageOpen]);

  const memberIds = new Set(members.map((m) => m.id));
  const addCandidates = candidates.filter((c) => !memberIds.has(c.id));

  function add(memberId: string) {
    setError(null);
    startTransition(async () => {
      const result = await addGroupMember(conversationId, memberId);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function remove(memberId: string) {
    setError(null);
    startTransition(async () => {
      const result = await removeGroupMember(conversationId, memberId);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <Menu trigger={<span aria-hidden>⋯</span>} align="end">
        <button type="button" onClick={() => setManageOpen(true)} className={menuItemClass}>
          Manage group
        </button>
        <button type="button" onClick={() => setLeaveOpen(true)} className={menuDangerClass}>
          Leave group
        </button>
      </Menu>

      <Modal open={manageOpen} onClose={() => setManageOpen(false)} title="Group members">
        <ul className="max-h-52 space-y-1 overflow-y-auto">
          {members.map((m) => {
            const name = m.display_name ?? m.username;
            return (
              <li key={m.id} className="flex items-center gap-2 py-1">
                {m.avatar_url ? (
                  <AvatarImage
                    src={m.avatar_url}
                    alt=""
                    pro={m.is_pro}
                    className="h-8 w-8 shrink-0 rounded-full border border-[var(--border)] object-cover"
                  />
                ) : (
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--featured-surface)] text-xs font-semibold text-[var(--ink-muted)]">
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="min-w-0 flex-1 truncate text-sm text-[var(--ink)]">
                  {name}
                  {m.id === createdBy && (
                    <span className="ml-1.5 text-xs text-[var(--ink-muted)]">creator</span>
                  )}
                </span>
                {isCreator && m.id !== createdBy && (
                  <button
                    type="button"
                    onClick={() => remove(m.id)}
                    disabled={pending}
                    className="shrink-0 text-xs text-[var(--danger)] transition hover:underline disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        <p className="mb-1 mt-3 text-xs font-medium text-[var(--ink-muted)]">Add someone</p>
        <ul className="max-h-40 space-y-1 overflow-y-auto">
          {addCandidates.length === 0 && (
            <li className="py-2 text-sm text-[var(--ink-muted)]">No one else to add.</li>
          )}
          {addCandidates.map((c) => {
            const name = c.display_name ?? c.username;
            return (
              <li key={c.id} className="flex items-center gap-2 py-1">
                {c.avatar_url ? (
                  <AvatarImage
                    src={c.avatar_url}
                    alt=""
                    pro={c.is_pro}
                    className="h-8 w-8 shrink-0 rounded-full border border-[var(--border)] object-cover"
                  />
                ) : (
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--featured-surface)] text-xs font-semibold text-[var(--ink-muted)]">
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="min-w-0 flex-1 truncate text-sm text-[var(--ink)]">{name}</span>
                <button
                  type="button"
                  onClick={() => add(c.id)}
                  disabled={pending}
                  className="shrink-0 text-xs font-medium text-[var(--ink)] transition hover:underline disabled:opacity-50"
                >
                  Add
                </button>
              </li>
            );
          })}
        </ul>

        {error && <p className="mt-2 text-xs text-[var(--danger)]">{error}</p>}
      </Modal>

      <ConfirmDialog
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        onConfirm={() => leaveConversation(conversationId)}
        title="Leave group"
        message="Leave this group? You'll stop receiving messages here. Someone can add you back later."
        confirmLabel="Leave"
        destructive
      />
    </>
  );
}
