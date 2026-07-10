"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { renameClub, updateClubAvatar } from "../actions";

// Owner-only avatar + name editing for the club header. Split out of
// page.tsx (a Server Component) because both need client state (file input,
// rename textbox). Avatar upload goes straight from the browser to the
// public 'club-avatars' bucket (owner-write RLS keyed on the club-id path
// segment -- see the clubs v2 migration), then persists the URL via
// updateClubAvatar. Renaming regenerates the slug server-side, so a
// successful rename must navigate to the new URL or this page 404s next load.
export default function ClubHeaderEditor({ clubId, name }: { clubId: string; name: string }) {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(name);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setUploading(true);

    const path = `${clubId}/${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("club-avatars")
      .upload(path, file, { upsert: true });
    if (uploadError) {
      setError("Could not upload photo.");
      setUploading(false);
      return;
    }

    const { data: pub } = supabase.storage.from("club-avatars").getPublicUrl(path);
    const res = await updateClubAvatar(clubId, pub.publicUrl);
    setUploading(false);
    if (res.error) setError(res.error);
    else router.refresh();
  }

  async function handleRename() {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === name) {
      setRenaming(false);
      return;
    }
    setError(null);
    setPending(true);
    const res = await renameClub(clubId, trimmed);
    setPending(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setRenaming(false);
    if (res.slug) router.push(`/community/clubs/${res.slug}`);
  }

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="font-medium text-[var(--ink-muted)] transition hover:text-[var(--ink)] hover:underline disabled:opacity-50"
      >
        {uploading ? "Uploading…" : "Change photo"}
      </button>
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />

      {renaming ? (
        <div className="flex items-center gap-1.5">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-xs"
          />
          <button
            type="button"
            onClick={handleRename}
            disabled={pending}
            className="font-medium text-[var(--ink)] hover:underline disabled:opacity-50"
          >
            {pending ? "…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => {
              setRenaming(false);
              setNewName(name);
            }}
            className="text-[var(--ink-muted)] hover:underline"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setRenaming(true)}
          className="font-medium text-[var(--ink-muted)] transition hover:text-[var(--ink)] hover:underline"
        >
          Rename
        </button>
      )}

      {error && <p className="w-full text-[var(--danger)]">{error}</p>}
    </div>
  );
}
