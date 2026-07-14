"use client";

import { useActionState, useState, useTransition, type ReactNode } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import posthog from "posthog-js";
import {
  uploadAvatar,
  addExperience,
  addEducation,
  type AvatarState,
  type EditState,
  type ExperienceState,
  type EducationState,
} from "@/app/(app)/profile/edit/actions";
import { createPost, type ComposerState } from "@/app/(app)/feed/actions";
import { saveOnboardingBasics, finishOnboarding, getOnboardingMatches, type OnboardingMatch } from "@/app/(app)/onboarding/actions";
import AvatarBase from "@/components/ui/Avatar";
import SchoolAutocomplete from "@/components/profile/SchoolAutocomplete";
import DateRangePicker from "@/components/profile/DateRangePicker";
import UserBadges from "@/components/profile/UserBadges";
import FollowButton from "@/components/profile/FollowButton";
import { Skeleton } from "@/components/ui/Skeleton";
import Select from "@/components/ui/Select";
import { DEGREE_OPTIONS } from "@/lib/education-options";

export type OnboardingProfile = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  school: string;
  year: string | null;
  major: string | null;
  bio: string | null;
};

const KIND_OPTIONS = [
  { value: "internship", label: "Internship" },
  { value: "job", label: "Job" },
  { value: "research", label: "Research" },
  { value: "club_role", label: "Club role" },
];
// DEGREE_OPTIONS is `as const` in lib/education-options.ts, so it's a
// readonly array; Select's `options` prop wants a plain mutable array,
// hence the spread copy below.
const DEGREE_SELECT_OPTIONS = [...DEGREE_OPTIONS];

const label = "block text-sm font-medium text-[var(--ink)]";
const field = "input-base mt-1.5";

// Skippable 6-step wizard shown once after signup confirmation (see
// app/(app)/onboarding/page.tsx). Step 1 saves through the existing
// profile-edit action (via the local saveOnboardingBasics wrapper — see
// app/(app)/onboarding/actions.ts for why a wrapper is needed), step 3 posts
// through the existing composer action directly, steps 4/5 (education,
// experience) save through addEducation/addExperience directly. Neither
// shared action is modified here, only imported and called.
export default function OnboardingWizard({
  profile,
  followStep,
}: {
  profile: OnboardingProfile;
  followStep: ReactNode;
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const reduce = useReducedMotion();
  const currentYear = new Date().getFullYear();

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

  // Final step: live AI matches seeded from the major/goals just saved by the
  // education step (addEducation back-fills profiles.major/year server-side).
  // No matches (AI off, thin pool, nothing to seed with) → finish straight
  // away instead of showing an empty step.
  const [matches, setMatches] = useState<OnboardingMatch[]>([]);
  const [matchesPending, startMatches] = useTransition();

  function advanceToMatches() {
    // Step advances immediately so the skeleton rows below render for the
    // actual fetch latency, then real matches spring in when they land.
    setStep(6);
    startMatches(async () => {
      const results = await getOnboardingMatches();
      if (results.length === 0) {
        await finishOnboarding();
        return;
      }
      setMatches(results);
      posthog.capture("onboarding_matches_shown", { match_count: results.length });
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
      else setStep(4);
    });
  }

  const [eduPending, startEdu] = useTransition();
  const [eduError, setEduError] = useState<string | undefined>();

  function onSubmitEducation(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setEduError(undefined);
    startEdu(async () => {
      const result: EducationState = await addEducation({}, fd);
      if (result.error) setEduError(result.error);
      else setStep(5);
    });
  }

  const [expPending, startExp] = useTransition();
  const [expError, setExpError] = useState<string | undefined>();

  function onSubmitExperience(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setExpError(undefined);
    startExp(async () => {
      const result: ExperienceState = await addExperience({}, fd);
      if (result.error) setExpError(result.error);
      else advanceToMatches();
    });
  }

  return (
    <main className="mx-auto max-w-xl px-5 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Welcome to samehere</h1>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">Step {step} of 6</p>
          <div className="mt-2 h-1 w-40 overflow-hidden rounded-full bg-[var(--featured-surface)]">
            <div
              className="h-full rounded-full bg-[var(--blue)] transition-[width] duration-[400ms] ease-out"
              style={{ width: `${(step / 6) * 100}%` }}
            />
          </div>
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

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          className="card p-6"
          initial={reduce ? undefined : { opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduce ? undefined : { opacity: 0, x: -24 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
        {step === 1 && (
          <form onSubmit={onSubmitBasics}>
            {basicsError && (
              <p role="alert" className="mb-5 rounded-md border border-[var(--border-strong)] bg-[var(--featured-surface)] px-3 py-2 text-sm text-[var(--ink)]">
                {basicsError}
              </p>
            )}
            <div className="mb-6 flex items-center gap-4 border-b border-[var(--border)] pb-6">
              <AvatarBase
                src={avatarUrl}
                seed={profile.username}
                name={profile.display_name ?? profile.username}
                className="h-16 w-16 shrink-0 rounded-full border border-[var(--border)] text-xl"
              />
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
              <button type="button" onClick={() => setStep(1)} className="btn-ghost">
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
            <p className="mb-4 text-sm text-[var(--ink-muted)]">Optional: what are you building or figuring out?</p>
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
              <button type="button" onClick={() => setStep(4)} disabled={postPending} className="text-sm text-[var(--ink-muted)] underline disabled:opacity-50">
                Skip
              </button>
              <button type="submit" disabled={postPending || postContent.trim().length === 0} className="btn-primary !py-2.5">
                {postPending ? "Posting…" : "Post & continue"}
              </button>
            </div>
          </form>
        )}

        {step === 4 && (
          <form onSubmit={onSubmitEducation}>
            <h2 className="mb-1 text-lg font-semibold">Add your education</h2>
            <p className="mb-4 text-sm text-[var(--ink-muted)]">Where do you study? This powers your matches.</p>
            {eduError && <p role="alert" className="mb-3 text-sm text-[var(--danger)]">{eduError}</p>}
            <div className="flex flex-col gap-4">
              <div>
                <label htmlFor="edu-school" className={label}>School</label>
                <SchoolAutocomplete id="edu-school" name="school" domainName="school_domain" maxLength={100}
                  placeholder="Your university" className={field} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={label}>Degree</label>
                  <Select
                    options={DEGREE_SELECT_OPTIONS}
                    name="degree"
                    defaultValue=""
                    ariaLabel="Degree"
                    className="mt-1.5 w-full"
                  />
                </div>
                <div>
                  <label htmlFor="edu-field" className={label}>Field (optional)</label>
                  <input id="edu-field" name="field" type="text" maxLength={80}
                    placeholder="e.g. Computer Science" className={field} />
                </div>
              </div>
              <DateRangePicker currentYear={currentYear} />
            </div>
            <div className="mt-6 flex items-center justify-between">
              <button type="button" onClick={() => setStep(5)} disabled={eduPending} className="text-sm text-[var(--ink-muted)] underline disabled:opacity-50">
                Skip
              </button>
              <button type="submit" disabled={eduPending} className="btn-primary !py-2.5">
                {eduPending ? "Saving…" : "Add & continue"}
              </button>
            </div>
          </form>
        )}

        {step === 5 && (
          <form onSubmit={onSubmitExperience}>
            <h2 className="mb-1 text-lg font-semibold">Add an experience</h2>
            <p className="mb-4 text-sm text-[var(--ink-muted)]">Interned somewhere? Led a club? It helps peers find you.</p>
            {expError && <p role="alert" className="mb-3 text-sm text-[var(--danger)]">{expError}</p>}
            <div className="flex flex-col gap-4">
              <div>
                <label className={label}>Type</label>
                <Select
                  options={KIND_OPTIONS}
                  name="kind"
                  defaultValue="internship"
                  ariaLabel="Type"
                  className="mt-1.5 w-full"
                />
              </div>
              <div>
                <label htmlFor="org" className={label}>Where</label>
                <input id="org" name="org" type="text" maxLength={80} placeholder="Company, lab, or club" className={field} />
              </div>
              <div>
                <label htmlFor="role" className={label}>Role</label>
                <input id="role" name="role" type="text" maxLength={80} placeholder="e.g. Software Engineering Intern" className={field} />
              </div>
              <DateRangePicker currentYear={currentYear} />
              <div>
                <label htmlFor="note" className={label}>Description (optional)</label>
                <input id="note" name="note" type="text" maxLength={600} placeholder="One line about what you did" className={field} />
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between">
              <button type="button" onClick={advanceToMatches} disabled={expPending || matchesPending} className="text-sm text-[var(--ink-muted)] underline disabled:opacity-50">
                Skip
              </button>
              <button type="submit" disabled={expPending || matchesPending} className="btn-primary !py-2.5">
                {expPending ? "Saving…" : matchesPending ? "Finding matches…" : "Add & continue"}
              </button>
            </div>
          </form>
        )}

        {step === 6 && (
          <div>
            <h2 className="mb-1 text-lg font-semibold">
              People already on your <span className="font-display italic text-[var(--blue)]">path</span>.
            </h2>
            <p className="mb-4 text-sm text-[var(--ink-muted)]">Students who fit what you&apos;re into, picked for you.</p>
            {matchesPending ? (
              <div className="flex flex-col gap-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--canvas)] p-3">
                    <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-28" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {matches.map((m, i) => {
                  const name = m.display_name ?? m.username;
                  const line = [m.year, m.major].filter(Boolean).join(" · ");
                  return (
                    <motion.div
                      key={m.id}
                      className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--canvas)] p-3"
                      initial={reduce ? undefined : { opacity: 0, y: 28, scale: 0.88 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.08 * i }}
                    >
                      <AvatarBase
                        src={m.avatar_url}
                        seed={m.username}
                        name={name}
                        className="h-9 w-9 shrink-0 rounded-full border border-[var(--border)] text-sm"
                        pro={m.is_pro}
                      />
                      <div className="min-w-0 flex-1 text-sm">
                        <div className="flex flex-wrap items-center gap-x-1.5">
                          <span className="font-medium">{name}</span>
                          <UserBadges isPro={m.is_pro} isFounder={m.is_founder} isCampusFounder={m.is_campus_founder} isVerifiedStudent={m.verified_student} />
                        </div>
                        {line && <p className="text-[var(--ink-muted)]">{line}</p>}
                        {m.reason && (
                          <motion.p
                            className="mt-0.5 text-xs text-[var(--ink-muted)]"
                            initial={reduce ? undefined : { opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.08 * i + 0.25, duration: 0.4 }}
                          >
                            {m.reason}
                          </motion.p>
                        )}
                      </div>
                      <FollowButton targetId={m.id} initial="none" />
                    </motion.div>
                  );
                })}
              </div>
            )}
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
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
