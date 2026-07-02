"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { updateProfile, type EditState } from "@/app/(app)/profile/edit/actions";
import { createClient } from "@/lib/supabase/client";

export type EditInitial = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  school: string;
  year: string | null;
  major: string | null;
  bio: string | null;
  goals: string | null;
  skills: string[] | null;
  is_private: boolean;
  hide_school: boolean;
  heatmap_visibility: string;
};

const label = "block text-sm font-medium text-[var(--ink)]";
const field =
  "mt-1.5 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[15px] text-[var(--ink)] outline-none transition placeholder:text-[var(--ink-faint)] focus:border-[var(--border-strong)] focus:ring-2 focus:ring-[#3b82f6]/40";
const hint = "mt-1 text-xs text-[var(--ink-muted)]";

const YEARS: [string, string][] = [
  ["", "—"],
  ["freshman", "Freshman"],
  ["sophomore", "Sophomore"],
  ["junior", "Junior"],
  ["senior", "Senior"],
  ["grad", "Grad student"],
];

export default function EditProfileForm({ initial }: { initial: EditInitial }) {
  const [state, formAction, pending] = useActionState<EditState, FormData>(updateProfile, {});

  const [supabase] = useState(createClient);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initial.avatar_url);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarErr, setAvatarErr] = useState<string | null>(null);

  // Upload straight from the browser to storage (no server hop). Stable path
  // {id}/avatar with upsert overwrites in place — no orphan files piling up.
  // The public URL is cache-busted with ?v= so the new image shows immediately.
  // Storage RLS pins writes to the user's own {id}/ folder; the profiles owner
  // policy pins the avatar_url write to their own row.
  // ponytail: avatar_url column isn't URL-checked in the DB. Low risk (own row,
  // rendered only as <img src>); add a CHECK/trigger if it ever needs pinning.
  async function onAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // let the same file be re-picked after an error
    if (!file) return;
    if (!file.type.startsWith("image/")) return setAvatarErr("Choose an image file.");
    if (file.size > 2 * 1024 * 1024) return setAvatarErr("Image must be under 2 MB.");

    setAvatarErr(null);
    setAvatarBusy(true);
    const path = `${initial.id}/avatar`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, cacheControl: "3600" });
    if (upErr) {
      setAvatarBusy(false);
      return setAvatarErr("Upload failed. Try again.");
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${data.publicUrl}?v=${Date.now()}`;
    const { error: dbErr } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", initial.id);
    setAvatarBusy(false);
    if (dbErr) return setAvatarErr("Saved the image but couldn't update your profile.");
    setAvatarUrl(url);
  }

  return (
    <main className="mx-auto max-w-xl px-5 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Edit profile</h1>
        <Link href={`/profile/${initial.username}`} className="text-sm text-[var(--ink-muted)] underline">
          Cancel
        </Link>
      </div>

      <form action={formAction} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
        {state.error && (
          <p role="alert" className="mb-5 rounded-md border border-[var(--border-strong)] px-3 py-2 text-sm">
            {state.error}
          </p>
        )}

        {/* Avatar */}
        <div className="mb-5 flex items-center gap-4">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              className="h-16 w-16 shrink-0 rounded-full border border-[var(--border)] object-cover"
            />
          ) : (
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--canvas)] text-xl font-semibold text-[var(--ink-muted)]">
              {(initial.display_name ?? initial.username).charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <label className="inline-block cursor-pointer rounded-md border border-[var(--border-strong)] px-3 py-1.5 text-sm font-medium transition active:opacity-80">
              <input type="file" accept="image/*" onChange={onAvatar} disabled={avatarBusy} className="hidden" />
              {avatarBusy ? "Uploading…" : "Change avatar"}
            </label>
            <p className={avatarErr ? "mt-1 text-xs text-[#c0392b] dark:text-[#e88]" : hint}>
              {avatarErr ?? "JPG, PNG, or WebP. Max 2 MB."}
            </p>
          </div>
        </div>

        <div className="mb-4">
          <label htmlFor="display_name" className={label}>Display name</label>
          <input id="display_name" name="display_name" type="text" maxLength={50}
            defaultValue={initial.display_name ?? ""} placeholder="Your name" className={field} />
        </div>

        <div className="mb-4">
          <label htmlFor="school" className={label}>School</label>
          <input id="school" name="school" type="text" maxLength={100}
            defaultValue={initial.school} placeholder="Your university" className={field} />
        </div>

        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="year" className={label}>Year</label>
            <select id="year" name="year" defaultValue={initial.year ?? ""} className={field}>
              {YEARS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="major" className={label}>Major</label>
            <input id="major" name="major" type="text" maxLength={100}
              defaultValue={initial.major ?? ""} placeholder="e.g. Computer Science" className={field} />
          </div>
        </div>

        <div className="mb-4">
          <label htmlFor="bio" className={label}>Bio</label>
          <textarea id="bio" name="bio" rows={3} maxLength={500}
            defaultValue={initial.bio ?? ""} placeholder="A few lines about you." className={field} />
        </div>

        <div className="mb-4">
          <label htmlFor="goals" className={label}>Goals</label>
          <textarea id="goals" name="goals" rows={2} maxLength={500}
            defaultValue={initial.goals ?? ""} placeholder="What are you working toward?" className={field} />
        </div>

        <div className="mb-5">
          <label htmlFor="skills" className={label}>Skills</label>
          <input id="skills" name="skills" type="text"
            defaultValue={(initial.skills ?? []).join(", ")} placeholder="react, python, design" className={field} />
          <p className={hint}>Comma-separated. Up to 20.</p>
        </div>

        {/* Preferences */}
        <fieldset className="mb-5 space-y-3 border-t border-[var(--border)] pt-5">
          <label className="flex items-center gap-2.5 text-sm">
            <input type="checkbox" name="is_private" defaultChecked={initial.is_private} className="h-4 w-4" />
            <span>Private account <span className="text-[var(--ink-muted)]">— require approval to follow</span></span>
          </label>
          <label className="flex items-center gap-2.5 text-sm">
            <input type="checkbox" name="hide_school" defaultChecked={initial.hide_school} className="h-4 w-4" />
            <span>Hide school <span className="text-[var(--ink-muted)]">— from people who don&apos;t follow you</span></span>
          </label>
          <div>
            <label htmlFor="heatmap_visibility" className={label}>Heatmap visibility</label>
            <select id="heatmap_visibility" name="heatmap_visibility"
              defaultValue={initial.heatmap_visibility} className={field}>
              <option value="public">Everyone</option>
              <option value="followers">Followers only</option>
            </select>
          </div>
        </fieldset>

        <button type="submit" disabled={pending}
          className="btn-inset w-full rounded-md bg-[var(--ink)] px-4 py-2.5 text-[15px] font-medium text-[var(--canvas)] transition active:opacity-80 disabled:opacity-60">
          {pending ? "Saving…" : "Save profile"}
        </button>
      </form>
    </main>
  );
}
