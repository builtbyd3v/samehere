"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { createChannel, deleteChannel } from "@/app/(app)/community/clubs/actions";

export type ClubChannel = {
  id: string;
  name: string;
  min_role: string;
  conversation_id: string;
  is_general: boolean;
};

const ROLE_OPTIONS = [
  { value: "everyone", label: "Everyone" },
  { value: "officers", label: "Officers" },
  { value: "owner", label: "Owner only" },
];

// Small local glyphs -- mirrors the s-spread/cls pattern in components/icons.tsx
// but these three are only ever used here, so they stay unexported and local.
function LockGlyph({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function PlusGlyph({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className={className} aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function TrashGlyph({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
    </svg>
  );
}

// Channel pill bar for a club's chat. RLS (can_read_channel) already filtered
// `channels` down to what the viewer may see -- the owner/officer checks below
// only decide what UI renders (create/delete controls), same as the role
// checks in the club detail page.
export default function ChannelBar({
  clubId,
  viewerRole,
  channels,
  selectedId,
  onSelect,
  onCreated,
  onDeleted,
}: {
  clubId: string;
  viewerRole: string;
  channels: ClubChannel[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreated: (channel: ClubChannel) => void;
  onDeleted: (channelId: string) => void;
}) {
  const [supabase] = useState(createClient);
  const canManage = viewerRole === "owner" || viewerRole === "officer";

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [minRole, setMinRole] = useState("everyone");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<ClubChannel | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    setCreateError(null);

    const res = await createChannel(clubId, trimmed, minRole);

    if (res.error || !res.channelId) {
      setCreateError(res.error ?? "Could not create channel.");
      setCreating(false);
      return;
    }

    const { data: row } = await supabase
      .from("club_channels")
      .select("id, name, min_role, conversation_id, is_general")
      .eq("id", res.channelId)
      .single();

    setCreating(false);
    if (row) {
      onCreated(row);
      setShowCreate(false);
      setName("");
      setMinRole("everyone");
    }
  }

  async function handleDelete() {
    if (!toDelete) return;
    setDeleteError(null);
    const res = await deleteChannel(toDelete.id);
    if (res.error) {
      setDeleteError(res.error);
      return;
    }
    onDeleted(toDelete.id);
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--border)] bg-[var(--surface-card)] px-3 py-2.5 sm:px-4">
      {channels.map((c) => {
        const selected = c.id === selectedId;
        return (
          <div key={c.id} className="flex items-center">
            <button
              type="button"
              onClick={() => onSelect(c.id)}
              className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                selected
                  ? "bg-[var(--ink)] text-[var(--canvas)]"
                  : "text-[var(--ink-muted)] hover:bg-[var(--featured-surface)] hover:text-[var(--ink)]"
              }`}
            >
              <span>#{c.name}</span>
              {c.min_role !== "everyone" && <LockGlyph />}
            </button>
            {canManage && !c.is_general && (
              <button
                type="button"
                onClick={() => {
                  setDeleteError(null);
                  setToDelete(c);
                }}
                aria-label={`Delete #${c.name}`}
                className="rounded-full p-1 text-[var(--ink-faint)] opacity-50 transition hover:bg-[var(--featured-surface)] hover:text-[var(--danger)] hover:opacity-100"
              >
                <TrashGlyph />
              </button>
            )}
          </div>
        );
      })}

      {canManage && (
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1 rounded-full border border-dashed border-[var(--border-strong)] px-3 py-1.5 text-sm font-medium text-[var(--ink-muted)] transition hover:bg-[var(--featured-surface)] hover:text-[var(--ink)]"
        >
          <PlusGlyph />
          New channel
        </button>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New channel">
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="channel-name"
            maxLength={40}
            required
            autoFocus
            className="rounded-md border border-[var(--border)] bg-[var(--canvas)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--border-strong)]"
          />
          <select
            value={minRole}
            onChange={(e) => setMinRole(e.target.value)}
            className="rounded-md border border-[var(--border)] bg-[var(--canvas)] px-3 py-2 text-sm text-[var(--ink)]"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          {createError && (
            <p role="alert" className="text-sm text-[var(--danger)]">
              {createError}
            </p>
          )}
          <button
            type="submit"
            disabled={creating}
            className="btn-inset self-start rounded-md bg-[var(--ink)] px-3 py-1.5 text-sm font-medium text-[var(--canvas)] disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create"}
          </button>
        </form>
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
        title="Delete channel"
        message={toDelete ? `Delete #${toDelete.name}? Its messages go with it.` : ""}
        confirmLabel="Delete"
        destructive
      />

      {deleteError && (
        <p role="alert" className="w-full text-sm text-[var(--danger)]">
          {deleteError}
        </p>
      )}
    </div>
  );
}
