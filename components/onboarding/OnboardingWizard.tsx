"use client";

import { useActionState, useState, useTransition, type ReactNode } from "react";
import { uploadAvatar, type AvatarState, type EditState } from "@/app/(app)/profile/edit/actions";
import { createPost, type ComposerState } from "@/app/(app)/feed/actions";
import { saveOnboardingBasics, finishOnboarding, getOnboardingMatches, type OnboardingMatch } from "@/app/(app)/onboarding/actions";
import AvatarImage from "@/components/ui/AvatarImage";
import SchoolAutocomplete from "@/components/profile/SchoolAutocomplete";
import UserBadges from "@/components/profile/UserBadges";
import FollowButton from "@/components/profile/FollowButton";

export type OnboardingProfile = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  school: string;
  year: string | null;
  major: string | null;
  bio: string | null;
};

const YEARS: [string, string][] = [
  ["", "Select year"],
  ["freshman", "Freshman"],
  ["sophomore", "Sophomore"],
  ["junior", "Junior"],
  ["senior", "Senior"],
  ["grad", "Grad student"],
];

const label = "block text-sm font-medium text-[var(--ink)]";
const field = "input-base mt-1.5";

// Skippable 3-step wizard shown once after signup confirmation (see
// app/(app)/onboarding/page.tsx). Step 1 saves through the existing
// profile-edit action (via the local saveOnboardingBasics wrapper — see
// app/(app)/onboarding/actions.ts for why a wrapper is needed), step 3 posts
// through the existing composer action directly. Neither shared action is
// modified here, only imported and called.
export default function OnboardingWizard({
  profile,
  followStep,
}: {
  profile: OnboardingProfile;
  followStep: ReactNode;
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Avatar upload has no redirect in its own action, so it's called directly
  // (same pattern as EditProfileForm) — no wrapper needed.
  const [avatarState, avatarAction, avatarBusy] = useActionState<AvatarState, FormData>(uploadAvatar, {});
  const avatarUrl = avatarState.url ?? profile.avatar_url;

  function onAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // let the same file be re-picked after an error
    if (!file) return;
    const fd = new FormData();
    fd.set("avatar", file);
    avatarAction(fd);
  }

  const [basicsPending, startBasics] = useTransition();
  const [basicsError, setBasicsError] = useState<string | undefined>();

  function onSubmitBasics(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBasicsError(undefined);
    startBasics(async () => {
      const result: EditState = await saveOnboardingBasics({}, fd);
      if (result.error) setBasicsError(result.error);
      else setStep(2);
    });
  }

  const [postContent, setPostContent] = useState("");
  const [postPending, startPost] = useTransition();
  const [postError, setPostError] = useState<string | undefined>();
  const [finishing, startFinish] = useTransition();

  function onFinish() {
    startFinish(async () => {
      await finishOnboarding();
    });
  }

  // Final step: live AI matches seeded from the major/goals just saved in
  // step 1. No matches (AI off, thin pool, nothing to seed with) → finish
  // straight away instead of showing an empty step.
  const [matches, setMatches] = useState<OnboardingMatch[]>([]);
  const [matchesPending, startMatches] = useTransition();

  function advanceToMatches() {
    startMatches(async () => {
      const results = await getOnboardingMatches();
      if (results.length === 0) {
        await finishOnboarding();
        return;
      }
      setMatches(results);
      setStep(4);
    });
  }

  function onSubmitPost(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = postContent.trim();
    if (!trimmed) return;
    const fd = new FormData();
    fd.set("content", trimmed);
    setPostError(undefined);
    startPost(async () => {
      const result: ComposerState = await createPost({}, fd);
      if (result.error) setPostError(result.error);
      else advanceToMatches();
    });
  }

  return (
    <main className="mx-auto max-w-xl px-5 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Welcome to samehere</h1>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">Step {step} of 4</p>
        </div>
        <button
          type="button"
          onClick={onFinish}
          disabled={finishing}
          className="text-sm text-[var(--ink-muted)] underline disabled:opacity-50"
        >
          Skip onboarding
        </button>
      </div>

      <div key={step} className="card animate-[modal-in_200ms_var(--ease-out)] p-6 motion-reduce:animate-none">
        {step === 1 && (
          <form onSubmit={onSubmitBasics}>
            {basicsError && (
              <p role="alert" className="mb-5 rounded-md border border-[var(--border-strong)] bg-[var(--featured-surface)] px-3 py-2 text-sm text-[var(--ink)]">
                {basicsError}
              </p>
            )}
            <div className="mb-6 flex items-center gap-4 border-b border-[var(--border)] pb-6">
              {avatarUrl ? (
                <AvatarImage
                  src={avatarUrl}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-full border border-[var(--border)] object-cover"
                />
              ) : (
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--canvas)] text-xl font-semibold text-[var(--ink-muted)]">
                  {(profile.display_name ?? profile.username).charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <label className="btn-ghost inline-flex cursor-pointer !py-1.5 text-sm">
                  <input type="file" accept="image/*" onChange={onAvatar} disabled={avatarBusy} className="hidden" />
                  {avatarBusy ? "Uploading…" : "Add a photo"}
                </label>
                <p className={avatarState.error ? "mt-1.5 text-xs text-[var(--danger)]" : "mt-1 text-xs text-[var(--ink-muted)]"}>
                  {avatarState.error ?? "JPG, PNG, or WebP. Max 2 MB."}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label htmlFor="display_name" className={label}>Display name</label>
                <input id="display_name" name="display_name" type="text" maxLength={50}
                  defaultValue={profile.display_name ?? ""} placeholder="Your name" className={field} />
              </div>
              <div>
                <label htmlFor="school" className={label}>School</label>
                <SchoolAutocomplete id="school" name="school" maxLength={100}
                  defaultValue={profile.school} placeholder="Your university" className={field} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="year" className={label}>Year</label>
                  <select id="year" name="year" defaultValue={profile.year ?? ""} className={field}>
                    {YEARS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="major" className={label}>Major</label>
                  <input id="major" name="major" type="text" maxLength={100}
                    defaultValue={profile.major ?? ""} placeholder="e.g. Computer Science" className={field} />
                </div>
              </div>
              <div>
                <label htmlFor="bio" className={label}>One-line bio</label>
                <input id="bio" name="bio" type="text" maxLength={150}
                  defaultValue={profile.bio ?? ""} placeholder="What are you into?" className={field} />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button type="button" onClick={() => setStep(2)} className="text-sm text-[var(--ink-muted)] underline">
                Skip for now
              </button>
              <button type="submit" disabled={basicsPending} className="btn-primary !py-2.5">
                {basicsPending ? "Saving…" : "Continue"}
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <div>
            <h2 className="mb-1 text-lg font-semibold">Follow a few students</h2>
            <p className="mb-4 text-sm text-[var(--ink-muted)]">People with a similar school, year, or major.</p>
            {followStep}
            <div className="mt-6 flex items-center justify-between">
              <button type="button" onClick={() => setStep(1)} className="text-sm text-[var(--ink-muted)] underline">
                Back
              </button>
              <button type="button" onClick={() => setStep(3)} className="btn-primary !py-2.5">
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <form onSubmit={onSubmitPost}>
            <h2 className="mb-1 text-lg font-semibold">Post something real</h2>
            <p className="mb-4 text-sm text-[var(--ink-muted)]">Optional — what are you building or figuring out?</p>
            {postError && <p role="alert" className="mb-3 text-sm text-[var(--danger)]">{postError}</p>}
            <textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              rows={4}
              maxLength={280}
              placeholder="Share what you're building…"
              className="w-full resize-y rounded-lg border border-[var(--border)] bg-transparent p-3 text-[15px] leading-[1.55] text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)]"
            />
            <div className="mt-6 flex items-center justify-between">
              <button type="button" onClick={advanceToMatches} disabled={finishing || matchesPending} className="text-sm text-[var(--ink-muted)] underline disabled:opacity-50">
                Skip
              </button>
              <button type="submit" disabled={postPending || finishing || matchesPending || postContent.trim().length === 0} className="btn-primary !py-2.5">
                {postPending ? "Posting…" : matchesPending ? "Finding matches…" : "Post & finish"}
              </button>
            </div>
          </form>
        )}

        {step === 4 && (
          <div>
            <h2 className="mb-1 text-lg font-semibold">Your first matches</h2>
            <p className="mb-4 text-sm text-[var(--ink-muted)]">Students who fit what you&apos;re into, picked for you.</p>
            <div className="flex flex-col gap-2">
              {matches.map((m) => {
                const name = m.display_name ?? m.username;
                const line = [m.year, m.major].filter(Boolean).join(" · ");
                return (
                  <div key={m.id} className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--canvas)] p-3">
                    {m.avatar_url ? (
                      <AvatarImage
                        src={m.avatar_url}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-full border border-[var(--border)] object-cover"
                        pro={m.is_pro}
                      />
                    ) : (
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-sm font-semibold text-[var(--ink-muted)]">
                        {name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1 text-sm">
                      <div className="flex flex-wrap items-center gap-x-1.5">
                        <span className="font-medium">{name}</span>
                        <UserBadges isPro={m.is_pro} isFounder={m.is_founder} isCampusFounder={m.is_campus_founder} isVerifiedStudent={m.verified_student} />
                      </div>
                      {line && <p className="text-[var(--ink-muted)]">{line}</p>}
                      {m.reason && <p className="mt-0.5 text-xs text-[var(--ink-muted)]">{m.reason}</p>}
                    </div>
                    <FollowButton targetId={m.id} initial="none" />
                  </div>
                );
              })}
            </div>
            <div className="mt-6 flex items-center justify-between">
              <button type="button" onClick={onFinish} disabled={finishing} className="text-sm text-[var(--ink-muted)] underline disabled:opacity-50">
                Skip
              </button>
              <button type="button" onClick={onFinish} disabled={finishing} className="btn-primary !py-2.5">
                {finishing ? "Finishing…" : "Finish"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
