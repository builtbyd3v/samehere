"use client";

import Link from "next/link";
import { useActionState, useRef, useState, useTransition } from "react";
import { draftProfileText, updateProfile, uploadAvatar, uploadBanner, type AvatarState, type DraftState, type EditState } from "@/app/(app)/profile/edit/actions";
import { isPro } from "@/lib/pro";
import { PROFILE_THEME_KEYS, PROFILE_THEMES, isProfileTheme, type ProfileTheme } from "@/lib/themes";
import AvatarBase from "@/components/ui/Avatar";
import ProfileNudgePanel from "@/components/profile/ProfileNudgePanel";

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
  const [state, formAction, _pending] = useActionState<EditState, FormData>(updateProfile, {});

  const [avatarState, avatarAction, avatarBusy] = useActionState<AvatarState, FormData>(uploadAvatar, {});
  const avatarUrl = avatarState.url ?? initial.avatar_url;
  const [bannerState, bannerAction, bannerBusy] = useActionState<AvatarState, FormData>(uploadBanner, {});
  const bannerUrl = bannerState.url ?? initial.banner_url;
  const [profileTheme, setProfileTheme] = useState<ProfileTheme | null>(
    isProfileTheme(initial.profile_theme) ? initial.profile_theme : null
  );
  const pro = isPro(initial);

  // Bio + goals are uncontrolled (defaultValue); the draft button writes into
  // them directly via ref so typing elsewhere isn't fought by React state.
  const bioRef = useRef<HTMLTextAreaElement>(null);
  const goalsRef = useRef<HTMLTextAreaElement>(null);
  const [draftState, setDraftState] = useState<DraftState>({});
  const [drafting, startDraft] = useTransition();

  function onDraft() {
    startDraft(async () => {
      const result = await draftProfileText();
      setDraftState(result);
      if (result.bio && bioRef.current) bioRef.current.value = result.bio;
      if (result.goals && goalsRef.current) goalsRef.current.value = result.goals;
    });
  }

  // Server action validates MIME/size/animation and gates animated avatars
  // behind Pro (client checks below are UX only, not the trust boundary).

  function onAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // let the same file be re-picked after an error
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

      <ProfileNudgePanel
        profile={{
          display_name: initial.display_name,
          avatar_url: avatarUrl,
          school: initial.school,
          year: initial.year,
          major: initial.major,
          bio: initial.bio,
          goals: initial.goals,
        }}
      />

      <form id="edit-profile-form" action={formAction} className="card p-6">
        {state.error && (
          <p role="alert" className="mb-5 rounded-md border border-[var(--border-strong)] bg-[var(--featured-surface)] px-3 py-2 text-sm text-[var(--ink)]">
            {state.error}
          </p>
        )}

        {/* Media: banner + avatar grouped into one compact block */}
        <div className="mb-6 space-y-4 border-b border-[var(--border)] pb-6">
          {/* Banner (Pro) */}
          <div>
            <label className={label}>Profile banner</label>
            {pro ? (
              <>
                <div className="mt-1.5 aspect-[4/1] w-full overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--canvas)]">
                  {bannerUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={bannerUrl} alt="" className="h-full w-full object-cover" />
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

          {/* Avatar */}
          <div className="flex items-center gap-4">
            <AvatarBase
              src={avatarUrl}
              seed={initial.username}
              name={initial.display_name ?? initial.username}
              className="h-16 w-16 shrink-0 rounded-full border border-[var(--border)] text-xl"
              pro={pro}
            />
            <div>
              <label
                id="avatar-upload"
                className="btn-ghost inline-flex cursor-pointer !py-1.5 text-sm"
              >
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
            <div className="flex items-center justify-between">
              <label htmlFor="bio" className={label}>Bio</label>
              <button type="button" onClick={onDraft} disabled={drafting} className="btn-ghost !py-1 !px-2 text-xs">
                {drafting ? "Drafting…" : "✦ Draft with AI"}
              </button>
            </div>
            {draftState.overCap && (
              <p className="mt-1 text-xs text-[var(--ink-muted)]">
                Out of AI drafts today. <Link href="/pro" className="underline">Pro for more</Link>
              </p>
            )}
            {draftState.error && <p className="mt-1 text-xs text-[var(--danger)]">{draftState.error}</p>}
            <textarea ref={bioRef} id="bio" name="bio" rows={3} maxLength={500}
              defaultValue={initial.bio ?? ""} placeholder="A few lines about you." className={field} />
          </div>

          <div>
            <label htmlFor="goals" className={label}>Goals</label>
            <textarea ref={goalsRef} id="goals" name="goals" rows={2} maxLength={500}
              defaultValue={initial.goals ?? ""} placeholder="What are you working toward?" className={field} />
          </div>

          {/* Hidden field carries the submitted value; the swatch buttons below
              just drive `profileTheme` state (no name attr of their own). */}
          <input type="hidden" name="profile_theme" value={profileTheme ?? ""} />
          {(
            <div className="border-t border-[var(--border)] pt-4">
              <label className={label}>Profile theme</label>
              {pro ? (
                <>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setProfileTheme(null)}
                      aria-pressed={profileTheme === null}
                      className={`h-9 rounded-full border px-3 text-sm active:scale-[0.98] ${
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
                        className={`flex h-9 items-center gap-2 rounded-full border px-3 text-sm active:scale-[0.98] ${
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
          )}
        </div>

      </form>
    </main>
  );
}
