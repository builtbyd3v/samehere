"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { updateProfile, uploadAvatar, type AvatarState, type EditState } from "@/app/(app)/profile/edit/actions";
import { isPro } from "@/lib/pro";
import AvatarImage from "@/components/ui/AvatarImage";
import ProfileNudgePanel from "@/components/profile/ProfileNudgePanel";
import SchoolAutocomplete from "@/components/profile/SchoolAutocomplete";

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
  courses: string[] | null;
  is_private: boolean;
  hide_school: boolean;
  heatmap_visibility: string;
  is_pro: boolean;
  accent_color: string | null;
};

const label = "block text-sm font-medium text-[var(--ink)]";
const field = "input-base mt-1.5";
const hint = "mt-1 text-xs text-[var(--ink-muted)]";

const YEARS: [string, string][] = [
  ["", "Select year"],
  ["freshman", "Freshman"],
  ["sophomore", "Sophomore"],
  ["junior", "Junior"],
  ["senior", "Senior"],
  ["grad", "Grad student"],
];

export default function EditProfileForm({ initial }: { initial: EditInitial }) {
  const [state, formAction, pending] = useActionState<EditState, FormData>(updateProfile, {});

  const [avatarUrl, setAvatarUrl] = useState<string | null>(initial.avatar_url);
  const [avatarState, avatarAction, avatarBusy] = useActionState<AvatarState, FormData>(uploadAvatar, {});
  const [accentColor, setAccentColor] = useState<string | null>(initial.accent_color);
  const pro = isPro(initial);

  // Server action validates MIME/size/animation and gates animated avatars
  // behind Pro (client checks below are UX only, not the trust boundary).
  useEffect(() => {
    if (avatarState.url) setAvatarUrl(avatarState.url);
  }, [avatarState.url]);

  function onAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // let the same file be re-picked after an error
    if (!file) return;
    const fd = new FormData();
    fd.set("avatar", file);
    avatarAction(fd);
  }

  return (
    <main className="mx-auto max-w-xl px-5 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Edit profile</h1>
        <Link href={`/profile/${initial.username}`} className="text-sm text-[var(--ink-muted)] underline">
          Cancel
        </Link>
      </div>

      <ProfileNudgePanel
        profile={{
          display_name: initial.display_name,
          avatar_url: avatarUrl,
          school: initial.school,
          year: initial.year,
          major: initial.major,
          bio: initial.bio,
          goals: initial.goals,
          skills: initial.skills,
        }}
      />

      <form action={formAction} className="card p-6">
        {state.error && (
          <p role="alert" className="mb-5 rounded-md border border-[var(--border-strong)] bg-[var(--featured-surface)] px-3 py-2 text-sm text-[var(--ink)]">
            {state.error}
          </p>
        )}

        {/* Avatar */}
        <div className="mb-6 flex items-center gap-4 border-b border-[var(--border)] pb-6">
          {avatarUrl ? (
            <AvatarImage
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
            <label
              id="avatar-upload"
              className="btn-ghost inline-flex cursor-pointer !py-1.5 text-sm"
            >
              <input type="file" accept="image/*" onChange={onAvatar} disabled={avatarBusy} className="hidden" />
              {avatarBusy ? "Uploading…" : "Change avatar"}
            </label>
            <p className={avatarState.error ? "mt-1.5 text-xs text-[#c0392b] dark:text-[#e88]" : hint}>
              {avatarState.error ?? "JPG, PNG, or WebP. Max 2 MB."}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="display_name" className={label}>Display name</label>
            <input id="display_name" name="display_name" type="text" maxLength={50}
              defaultValue={initial.display_name ?? ""} placeholder="Your name" className={field} />
          </div>

          <div>
            <label htmlFor="school" className={label}>School</label>
            <SchoolAutocomplete id="school" name="school" maxLength={100}
              defaultValue={initial.school} placeholder="Your university" className={field} />
          </div>

          <div className="grid grid-cols-2 gap-4">
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

          <div>
            <label htmlFor="bio" className={label}>Bio</label>
            <textarea id="bio" name="bio" rows={3} maxLength={500}
              defaultValue={initial.bio ?? ""} placeholder="A few lines about you." className={field} />
          </div>

          <div>
            <label htmlFor="goals" className={label}>Goals</label>
            <textarea id="goals" name="goals" rows={2} maxLength={500}
              defaultValue={initial.goals ?? ""} placeholder="What are you working toward?" className={field} />
          </div>

          <div>
            <label htmlFor="skills" className={label}>Skills</label>
            <input id="skills" name="skills" type="text"
              defaultValue={(initial.skills ?? []).join(", ")} placeholder="react, python, design" className={field} />
            <p className={hint}>Comma-separated. Up to 20.</p>
          </div>

          {/* ponytail: mirrors the skills field exactly, same tag-input pattern */}
          <div>
            <label htmlFor="courses" className={label}>Courses</label>
            <input id="courses" name="courses" type="text"
              defaultValue={(initial.courses ?? []).join(", ")} placeholder="CS 61A, MATH 54" className={field} />
            <p className={hint}>Add courses you're taking. Comma-separated. Up to 20.</p>
          </div>

          <div className="border-t border-[var(--border)] pt-4">
            <label className={label}>Accent color</label>
            {pro ? (
              <>
                {/* Hidden field carries the submitted value; the color input is
                    just the picker UI (no name) so "Clear" can null it out. */}
                <input type="hidden" name="accent_color" value={accentColor ?? ""} />
                <div className="mt-1.5 flex items-center gap-3">
                  <input
                    type="color"
                    aria-label="Accent color"
                    value={accentColor ?? "#3b82f6"}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded-md border border-[var(--border)] bg-[var(--surface)] p-1"
                  />
                  {accentColor && (
                    <button
                      type="button"
                      onClick={() => setAccentColor(null)}
                      className="text-sm text-[var(--ink-muted)] underline active:scale-[0.98]"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <p className={hint}>Shown as a ring around your avatar.</p>
              </>
            ) : (
              <div className="mt-1.5 flex items-center gap-3">
                <div className="h-10 w-14 rounded-md border border-[var(--border)] bg-[var(--canvas)] opacity-50" />
                <Link href="/pro" className="text-sm text-[var(--ink-muted)] underline">
                  Custom accent · Pro
                </Link>
              </div>
            )}
          </div>
        </div>

        <button type="submit" disabled={pending}
          className="btn-primary mt-6 w-full !py-2.5 text-[15px]">
          {pending ? "Saving…" : "Save profile"}
        </button>
      </form>
    </main>
  );
}
