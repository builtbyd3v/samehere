"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setMemberRole } from "@/app/(app)/community/clubs/actions";

const ROLES = ["member", "officer", "owner"] as const;

// Owner-only role/title editor for a single member row. club_set_role (RLS)
// is the real gate -- caller=owner is only checked here to decide who SEES
// this control, not to authorize the write.
export default function RoleControls({
  clubId,
  userId,
  role,
  title,
}: {
  clubId: string;
  userId: string;
  role: string;
  title: string | null;
}) {
  const router = useRouter();
  const [nextRole, setNextRole] = useState(role);
  const [nextTitle, setNextTitle] = useState(title ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await setMemberRole(clubId, userId, nextRole, nextTitle.trim() || null);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <select
        value={nextRole}
        onChange={(e) => setNextRole(e.target.value)}
        className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-1.5 py-1 text-xs"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <input
        value={nextTitle}
        onChange={(e) => setNextTitle(e.target.value)}
        placeholder="Title"
        className="w-20 rounded-md border border-[var(--border)] bg-[var(--surface)] px-1.5 py-1 text-xs"
      />
      <button
        type="button"
        onClick={save}
        disabled={pending}
        className="rounded-md border border-[var(--border-strong)] px-2 py-1 text-xs font-medium transition hover:bg-[var(--featured-surface)] disabled:opacity-50"
      >
        {pending ? "…" : "Save"}
      </button>
      {error && <p className="w-full text-xs text-[var(--danger)]">{error}</p>}
    </div>
  );
}
