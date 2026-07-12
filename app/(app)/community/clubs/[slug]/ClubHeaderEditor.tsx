"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/client";
import { updateClubAvatar } from "../actions";

// Owner-only club avatar upload. (Name/purpose/tags/delete live in
// ClubOwnerActions -- rename is there, since a rename regenerates the slug.)
// Avatar upload goes straight from the browser to the public 'club-avatars'
// bucket (owner-write RLS keyed on the club-id path segment -- see the clubs
// v2 migration), then persists the URL via updateClubAvatar.
export default function ClubHeaderEditor({ clubId }: { clubId: string }) {
  const router = useRouter();
  const [supabase] = useState(getBrowserClient);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
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
      {error && <p className="w-full text-[var(--danger)]">{error}</p>}
    </div>
  );
}
