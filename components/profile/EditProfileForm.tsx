"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useState } from "react";
import { updateProfile, uploadAvatar, uploadBanner, type AvatarState, type EditState } from "@/app/(app)/profile/edit/actions";
import { isSupabaseStorageUrl } from "@/lib/storage-image";
import { isPro } from "@/lib/pro";
import { PROFILE_THEME_KEYS, PROFILE_THEMES, isProfileTheme, type ProfileTheme } from "@/lib/themes";
import { OPEN_TO_TAGS } from "@/lib/portfolio/validation";
import { OPEN_TO_LABELS } from "@/lib/portfolio/labels";
import AvatarBase from "@/components/ui/Avatar";

export type EditInitial = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  school: string;
  year: string | null;
  major: string | null;
  bio: string | null;
  goals: string | null;
  open_to: string[];
  is_private: boolean;
  hide_school: boolean;
  heatmap_visibility: string;
  is_pro: boolean;
  pro_until: string | null;
  profile_theme: string | null;
};

const label = "block text-sm font-medium text-[var(--ink)]";
const field = "input-base mt-1.5";
const hint = "mt-1 text-xs text-[var(--ink-muted)]";

export default function EditProfileForm({ initial }: { initial: EditInitial }) {
  const [state, formAction] = useActionState<EditState, FormData>(updateProfile, {});
  const [avatarState, avatarAction, avatarBusy] = useActionState<AvatarState, FormData>(uploadAvatar, {});
  const avatarUrl = avatarState.url ?? initial.avatar_url;
  const [bannerState, bannerAction, bannerBusy] = useActionState<AvatarState, FormData>(uploadBanner, {});
  const bannerUrl = bannerState.url ?? initial.banner_url;
  const [profileTheme, setProfileTheme] = useState<ProfileTheme | null>(
    isProfileTheme(initial.profile_theme) ? initial.profile_theme : null
  );
  const pro = isPro(initial);

  function onAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const fd = new FormData();
    fd.set("avatar", file);
    avatarAction(fd);
  }

  function onBanner(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const fd = new FormData();
    fd.set("banner", file);
    bannerAction(fd);
  }

  return (
    <main className="mx-auto max-w-xl px-5 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Edit profile</h1>
        <Link href={`/profile/${initial.username}`} className="text-sm text-[var(--ink-muted)] underline">
          Cancel
        </Link>
      </div>

      <form id="edit-profile-form" action={formAction} className="card p-6">
        {state.error && (
          <p role="alert" className="mb-5 rounded-md border border-[var(--border-strong)] bg-[var(--featured-surface)] px-3 py-2 text-sm text-[var(--ink)]">
            {state.error}
          </p>
        )}

        <div className="mb-6 space-y-4 border-b border-[var(--border)] pb-6">
          <div>
            <label className={label}>Profile banner</label>
            {pro ? (
              <>
                <div className="relative mt-1.5 aspect-[4/1] w-full overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--canvas)]">
                  {bannerUrl ? (
                    isSupabaseStorageUrl(bannerUrl) ? (
                      <Image src={bannerUrl} alt="" fill sizes="(max-width: 640px) 100vw, 576px" className="object-cover" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element -- host not in images.remotePatterns
                      <img src={bannerUrl} alt="" className="h-full w-full object-cover" />
                    )
                  ) : (
                    <div className="grid h-full place-items-center text-xs text-[var(--ink-faint)]">No banner yet</div>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <label className="btn-ghost inline-flex cursor-pointer !py-1.5 text-sm">
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onBanner} disabled={bannerBusy} className="hidden" />
                    {bannerBusy ? "Uploading…" : "Change banner"}
                  </label>
                  <p className={bannerState.error ? "text-xs text-[var(--danger)]" : hint}>
                    {bannerState.error ?? "JPG, PNG, or WebP. Max 4 MB."}
                  </p>
                </div>
              </>
            ) : (
              <div className="mt-1.5">
                <div className="aspect-[4/1] w-full rounded-lg border border-[var(--border)] bg-[var(--canvas)] opacity-50" />
                <Link href="/pro" className="mt-2 inline-block text-sm text-[var(--ink-muted)] underline">
                  Profile banner · Pro
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <AvatarBase
              src={avatarUrl}
              seed={initial.username}
              name={initial.display_name ?? initial.username}
              className="h-16 w-16 shrink-0 rounded-full border border-[var(--border)] text-xl"
              pro={pro}
            />
            <div>
              <label id="avatar-upload" className="btn-ghost inline-flex cursor-pointer !py-1.5 text-sm">
                <input type="file" accept="image/*" onChange={onAvatar} disabled={avatarBusy} className="hidden" />
                {avatarBusy ? "Uploading…" : "Change avatar"}
              </label>
              <p className={avatarState.error ? "mt-1.5 text-xs text-[var(--danger)]" : hint}>
                {avatarState.error ?? "JPG, PNG, or WebP. Max 2 MB."}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div>
            <label htmlFor="display_name" className={label}>Display name</label>
            <input id="display_name" name="display_name" type="text" maxLength={50}
              defaultValue={initial.display_name ?? ""} placeholder="Your name" className={field} />
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

          <fieldset>
            <legend className={label}>Open to</legend>
            <p className={hint}>Optional. An invitation to message, not a DM bypass.</p>
            <ul className="mt-2 flex flex-col gap-2">
              {OPEN_TO_TAGS.map((tag) => (
                <li key={tag}>
                  <label className="flex items-center gap-2.5 text-sm text-[var(--ink)]">
                    <input
                      type="checkbox"
                      name="open_to"
                      value={tag}
                      defaultChecked={initial.open_to.includes(tag)}
                      className="h-4 w-4 accent-[var(--ink)]"
                    />
                    {OPEN_TO_LABELS[tag]}
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>

          <input type="hidden" name="profile_theme" value={profileTheme ?? ""} />
          <div className="border-t border-[var(--border)] pt-4">
            <label className={label}>Profile theme</label>
            {pro ? (
              <>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setProfileTheme(null)}
                    aria-pressed={profileTheme === null}
                    className={`h-9 rounded-full border px-3 text-sm ${
                      profileTheme === null
                        ? "border-[var(--ink)] text-[var(--ink)]"
                        : "border-[var(--border)] text-[var(--ink-muted)]"
                    }`}
                  >
                    None
                  </button>
                  {PROFILE_THEME_KEYS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setProfileTheme(key)}
                      aria-pressed={profileTheme === key}
                      title={PROFILE_THEMES[key].label}
                      className={`flex h-9 items-center gap-2 rounded-full border px-3 text-sm ${
                        profileTheme === key
                          ? "border-[var(--ink)] text-[var(--ink)]"
                          : "border-[var(--border)] text-[var(--ink-muted)]"
                      }`}
                    >
                      <span
                        aria-hidden
                        className="h-3.5 w-3.5 rounded-full"
                        style={{ background: PROFILE_THEMES[key].accent }}
                      />
                      {PROFILE_THEMES[key].label}
                    </button>
                  ))}
                </div>
                <p className={hint}>A curated look for your profile.</p>
              </>
            ) : (
              <div className="mt-1.5 flex items-center gap-3">
                <div className="h-9 w-24 rounded-full border border-[var(--border)] bg-[var(--canvas)] opacity-50" />
                <Link href="/pro" className="text-sm text-[var(--ink-muted)] underline">
                  Profile themes · Pro
                </Link>
              </div>
            )}
          </div>
        </div>
      </form>
    </main>
  );
}
