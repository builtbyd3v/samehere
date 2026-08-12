"use client";

import { useActionState, useState, useTransition, type FormEvent } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  uploadAvatar,
  addExperience,
  addEducation,
  type AvatarState,
  type EditState,
  type ExperienceState,
  type EducationState,
} from "@/app/(app)/profile/edit/actions";
import { saveOnboardingBasics } from "@/app/(app)/onboarding/actions";
import AvatarBase from "@/components/ui/Avatar";
import SchoolAutocomplete from "@/components/profile/SchoolAutocomplete";
import DateRangePicker from "@/components/profile/DateRangePicker";
import Select from "@/components/ui/Select";
import PathIntakeForm from "@/components/path/PathIntakeForm";
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
  { value: "project", label: "Project" },
];
const DEGREE_SELECT_OPTIONS = [...DEGREE_OPTIONS];

const TOTAL_STEPS = 4;

const label = "block text-sm font-medium text-[var(--ink)]";
const field = "input-base mt-1.5";
const panel =
  "rounded-[var(--landing-radius)] border border-[var(--border)] bg-[var(--surface)] p-6";

// Struggle-aware path onboarding: basics → education → experience → intake →
// diagnosis (inline splash) → /home. No follow/post steps.
export default function OnboardingWizard({ profile }: { profile: OnboardingProfile }) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const reduce = useReducedMotion();
  const currentYear = new Date().getFullYear();

  const [avatarState, avatarAction, avatarBusy] = useActionState<AvatarState, FormData>(
    uploadAvatar,
    {},
  );
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

  function onSubmitBasics(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBasicsError(undefined);
    startBasics(async () => {
      const result: EditState = await saveOnboardingBasics({}, fd);
      if (result.error) setBasicsError(result.error);
      else setStep(2);
    });
  }

  const [eduPending, startEdu] = useTransition();
  const [eduError, setEduError] = useState<string | undefined>();

  function onSubmitEducation(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setEduError(undefined);
    startEdu(async () => {
      const result: EducationState = await addEducation({}, fd);
      if (result.error) setEduError(result.error);
      else setStep(3);
    });
  }

  const [expPending, startExp] = useTransition();
  const [expError, setExpError] = useState<string | undefined>();

  function onSubmitExperience(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setExpError(undefined);
    startExp(async () => {
      const result: ExperienceState = await addExperience({}, fd);
      if (result.error) setExpError(result.error);
      else setStep(4);
    });
  }

  const [diagnosing, setDiagnosing] = useState(false);

  const progressStep = diagnosing ? TOTAL_STEPS : step;

  return (
    <main className="mx-auto max-w-xl px-5 py-10">
      <div className="mb-6">
        <div className="min-w-0 flex-1">
          <p className="font-display text-2xl italic tracking-[-0.03em] text-[var(--ink)]">
            samehere
          </p>
          <h1 className="mt-2 text-[1.375rem] font-medium tracking-[-0.025em] text-[var(--ink)]">
            Build your internship path
          </h1>
          <p className="mt-1.5 text-sm text-[var(--ink-muted)]">
            {diagnosing ? "Diagnosing" : `Step ${progressStep} of ${TOTAL_STEPS}`}
          </p>
          <div className="mt-3 h-px w-44 overflow-hidden bg-[var(--border)]">
            <div
              className="h-full bg-[var(--accent-blue)] transition-[width] duration-[400ms] ease-out"
              style={{ width: `${(progressStep / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          className={panel}
          initial={reduce ? undefined : { opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduce ? undefined : { opacity: 0, x: -24 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          {step === 1 && !diagnosing && (
            <form onSubmit={onSubmitBasics}>
              {basicsError && (
                <p
                  role="alert"
                  className="mb-5 rounded-[var(--landing-radius-sm)] border border-[var(--border-strong)] bg-[var(--featured-surface)] px-3 py-2 text-sm text-[var(--ink)]"
                >
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
                  <label className="btn-ghost inline-flex cursor-pointer !h-9 !min-h-9 !px-4 !py-0 text-sm">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={onAvatar}
                      disabled={avatarBusy}
                      className="hidden"
                    />
                    {avatarBusy ? "Uploading…" : "Add a photo"}
                  </label>
                  <p
                    className={
                      avatarState.error
                        ? "mt-1.5 text-xs text-[var(--danger)]"
                        : "mt-1 text-xs text-[var(--ink-muted)]"
                    }
                  >
                    {avatarState.error ?? "JPG, PNG, or WebP. Max 2 MB."}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <label htmlFor="display_name" className={label}>
                    Display name
                  </label>
                  <input
                    id="display_name"
                    name="display_name"
                    type="text"
                    maxLength={50}
                    defaultValue={profile.display_name ?? ""}
                    placeholder="Your name"
                    className={field}
                  />
                </div>
                <div>
                  <label htmlFor="bio" className={label}>
                    One-line bio
                  </label>
                  <input
                    id="bio"
                    name="bio"
                    type="text"
                    maxLength={150}
                    defaultValue={profile.bio ?? ""}
                    placeholder="What are you working toward?"
                    className={field}
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-sm text-[var(--ink-muted)] underline"
                >
                  Skip for now
                </button>
                <button type="submit" disabled={basicsPending} className="btn-primary">
                  {basicsPending ? "Saving…" : "Continue"}
                </button>
              </div>
            </form>
          )}

          {step === 2 && !diagnosing && (
            <form onSubmit={onSubmitEducation}>
              <h2 className="mb-1 text-xl font-medium tracking-[-0.025em] text-[var(--ink)]">
                Education
              </h2>
              <p className="mb-4 text-sm text-[var(--ink-muted)]">
                Where you study shapes the path we build.
              </p>
              {eduError && (
                <p role="alert" className="mb-3 text-sm text-[var(--danger)]">
                  {eduError}
                </p>
              )}
              <div className="flex flex-col gap-4">
                <div>
                  <label htmlFor="edu-school" className={label}>
                    School
                  </label>
                  <SchoolAutocomplete
                    id="edu-school"
                    name="school"
                    domainName="school_domain"
                    maxLength={100}
                    placeholder="Your university"
                    className={field}
                  />
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
                    <label htmlFor="edu-field" className={label}>
                      Field (optional)
                    </label>
                    <input
                      id="edu-field"
                      name="field"
                      type="text"
                      maxLength={80}
                      placeholder="e.g. Computer Science"
                      className={field}
                    />
                  </div>
                </div>
                <DateRangePicker currentYear={currentYear} />
              </div>
              <div className="mt-6 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={eduPending}
                  className="text-sm text-[var(--ink-muted)] underline disabled:opacity-50"
                >
                  Skip
                </button>
                <button type="submit" disabled={eduPending} className="btn-primary">
                  {eduPending ? "Saving…" : "Continue"}
                </button>
              </div>
            </form>
          )}

          {step === 3 && !diagnosing && (
            <form onSubmit={onSubmitExperience}>
              <h2 className="mb-1 text-xl font-medium tracking-[-0.025em] text-[var(--ink)]">
                Experience
              </h2>
              <p className="mb-4 text-sm text-[var(--ink-muted)]">
                Interned, researched, or led something? Optional but useful.
              </p>
              {expError && (
                <p role="alert" className="mb-3 text-sm text-[var(--danger)]">
                  {expError}
                </p>
              )}
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
                  <label htmlFor="org" className={label}>
                    Where
                  </label>
                  <input
                    id="org"
                    name="org"
                    type="text"
                    maxLength={80}
                    placeholder="Company, lab, or club"
                    className={field}
                  />
                </div>
                <div>
                  <label htmlFor="role" className={label}>
                    Role
                  </label>
                  <input
                    id="role"
                    name="role"
                    type="text"
                    maxLength={80}
                    placeholder="e.g. Software Engineering Intern"
                    className={field}
                  />
                </div>
                <DateRangePicker currentYear={currentYear} />
                <div>
                  <label htmlFor="note" className={label}>
                    Description (optional)
                  </label>
                  <input
                    id="note"
                    name="note"
                    type="text"
                    maxLength={600}
                    placeholder="One line about what you did"
                    className={field}
                  />
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  disabled={expPending}
                  className="text-sm text-[var(--ink-muted)] underline disabled:opacity-50"
                >
                  Skip
                </button>
                <button type="submit" disabled={expPending} className="btn-primary">
                  {expPending ? "Saving…" : "Continue"}
                </button>
              </div>
            </form>
          )}

          {step === 4 && (
            <PathIntakeForm
              onDiagnosingChange={setDiagnosing}
              footer={
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={diagnosing}
                  className="btn-ghost"
                >
                  Back
                </button>
              }
            />
          )}
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
