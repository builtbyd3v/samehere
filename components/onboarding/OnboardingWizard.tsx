"use client";

import { useActionState, useState, useTransition } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  uploadAvatar,
  addExperience,
  addEducation,
  type AvatarState,
  type ExperienceState,
  type EducationState,
} from "@/app/(app)/profile/edit/actions";
import { createPost, type ComposerState } from "@/app/(app)/feed/actions";
import { saveOnboardingBasics, finishOnboarding } from "@/app/(app)/onboarding/actions";
import AvatarBase from "@/components/ui/Avatar";
import SchoolAutocomplete from "@/components/profile/SchoolAutocomplete";
import DateRangePicker from "@/components/profile/DateRangePicker";
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
const DEGREE_SELECT_OPTIONS = [...DEGREE_OPTIONS];

const label = "block text-sm font-medium text-[var(--ink)]";
const field = "input-base mt-1.5";

export default function OnboardingWizard({ profile }: { profile: OnboardingProfile }) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const reduce = useReducedMotion();
  const currentYear = new Date().getFullYear();

  const [avatarState, avatarAction, avatarBusy] = useActionState<AvatarState, FormData>(uploadAvatar, {});
  const avatarUrl = avatarState.url ?? profile.avatar_url;

  function onAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
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
      const result = await saveOnboardingBasics({}, fd);
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
      else setStep(3);
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
      else setStep(4);
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
      else await finishOnboarding();
    });
  }

  return (
    <main className="mx-auto max-w-xl px-5 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Set up your profile</h1>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">Optional · step {step} of 4</p>
          <div className="mt-2 h-1 w-40 overflow-hidden rounded-full bg-[var(--featured-surface)]">
            <div
              className="h-full rounded-full bg-[var(--blue)] transition-[width] duration-[400ms] ease-out"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={onFinish}
          disabled={finishing}
          className="text-sm text-[var(--ink-muted)] underline disabled:opacity-50"
        >
          Skip
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
          <form onSubmit={onSubmitPost}>
            <h2 className="mb-1 text-lg font-semibold">Post something real</h2>
            <p className="mb-4 text-sm text-[var(--ink-muted)]">Optional. What are you building or figuring out?</p>
            {postError && <p role="alert" className="mb-3 text-sm text-[var(--danger)]">{postError}</p>}
            <textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              rows={4}
              maxLength={280}
              placeholder="Share what you're building…"
              className="input-base w-full resize-y p-3 text-[15px] leading-[1.55]"
            />
            <div className="mt-6 flex items-center justify-between">
              <button type="button" onClick={() => setStep(3)} disabled={postPending} className="text-sm text-[var(--ink-muted)] underline disabled:opacity-50">
                Skip
              </button>
              <button type="submit" disabled={postPending || postContent.trim().length === 0} className="btn-primary !py-2.5">
                {postPending ? "Posting…" : "Post & continue"}
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={onSubmitEducation}>
            <h2 className="mb-1 text-lg font-semibold">Add your education</h2>
            <p className="mb-4 text-sm text-[var(--ink-muted)]">Where do you study? Optional.</p>
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
              <button type="button" onClick={() => setStep(4)} disabled={eduPending} className="text-sm text-[var(--ink-muted)] underline disabled:opacity-50">
                Skip
              </button>
              <button type="submit" disabled={eduPending} className="btn-primary !py-2.5">
                {eduPending ? "Saving…" : "Add & continue"}
              </button>
            </div>
          </form>
        )}

        {step === 4 && (
          <form onSubmit={onSubmitExperience}>
            <h2 className="mb-1 text-lg font-semibold">Add an experience</h2>
            <p className="mb-4 text-sm text-[var(--ink-muted)]">Interned somewhere? Led a club? Optional.</p>
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
              <button type="button" onClick={onFinish} disabled={expPending || finishing} className="text-sm text-[var(--ink-muted)] underline disabled:opacity-50">
                Skip
              </button>
              <button type="submit" disabled={expPending || finishing} className="btn-primary !py-2.5">
                {expPending || finishing ? "Saving…" : "Finish"}
              </button>
            </div>
          </form>
        )}
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
