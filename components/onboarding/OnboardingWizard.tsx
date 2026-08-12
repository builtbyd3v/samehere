"use client";

import { useActionState, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
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
import {
  saveOnboardingBasics,
  finishOnboarding,
  submitPathIntake,
  type PathIntakeState,
} from "@/app/(app)/onboarding/actions";
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

const STAGE_OPTIONS = [
  { value: "no_experience", label: "No experience yet" },
  { value: "building", label: "Building projects / skills" },
  { value: "applying", label: "Actively applying" },
  { value: "interviewing", label: "Interviewing" },
  { value: "offers", label: "Have offers / deciding" },
] as const;

const TIMELINE_OPTIONS = [
  { value: "this_cycle", label: "This recruiting cycle" },
  { value: "next_cycle", label: "Next cycle" },
  { value: "exploring", label: "Still exploring" },
] as const;

const CONSTRAINT_OPTIONS = [
  { value: "first_gen", label: "First-gen" },
  { value: "transfer", label: "Transfer" },
  { value: "commuter", label: "Commuter" },
  { value: "international", label: "International" },
  { value: "limited_network", label: "Limited network" },
  { value: "working_job", label: "Working a job" },
  { value: "career_switch", label: "Career switch" },
  { value: "overwhelmed", label: "Feeling overwhelmed" },
] as const;

const TOTAL_STEPS = 4;

const label = "block text-sm font-medium text-[var(--ink)]";
const field = "input-base mt-1.5";

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

  const [intakeState, setIntakeState] = useState<PathIntakeState>({});
  const [diagnosing, setDiagnosing] = useState(false);
  const [intakePending, startIntake] = useTransition();
  const [finishing, startFinish] = useTransition();

  function onFinish() {
    startFinish(async () => {
      await finishOnboarding();
    });
  }

  function onSubmitIntake(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setIntakeState({});
    setDiagnosing(true);
    startIntake(async () => {
      const result = await submitPathIntake({}, fd);
      if (result?.overCap || result?.error) {
        setIntakeState(result);
        setDiagnosing(false);
      }
      // success → server redirect to /home
    });
  }

  const progressStep = diagnosing ? TOTAL_STEPS : step;

  return (
    <main className="mx-auto max-w-xl px-5 py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-display text-3xl italic tracking-[-0.03em] text-[var(--blue)]">
            samehere
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-[var(--ink)]">
            Build your internship path
          </h1>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            {diagnosing ? "Diagnosing" : `Step ${progressStep} of ${TOTAL_STEPS}`}
          </p>
          <div className="mt-2 h-1 w-40 overflow-hidden rounded-full bg-[var(--featured-surface)]">
            <div
              className="h-full rounded-full bg-[var(--blue)] transition-[width] duration-[400ms] ease-out"
              style={{ width: `${(progressStep / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={onFinish}
          disabled={finishing || intakePending || diagnosing}
          className="shrink-0 text-sm text-[var(--ink-muted)] underline disabled:opacity-50"
        >
          Skip for now
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          className="rounded-2xl border border-[var(--border)] bg-[var(--canvas)] p-6 shadow-[0_1px_0_rgba(15,23,42,0.04)]"
          initial={reduce ? undefined : { opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduce ? undefined : { opacity: 0, x: -24 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          {step === 1 && (
            <form onSubmit={onSubmitBasics}>
              {basicsError && (
                <p
                  role="alert"
                  className="mb-5 rounded-md border border-[var(--border-strong)] bg-[var(--featured-surface)] px-3 py-2 text-sm text-[var(--ink)]"
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
                  <label className="btn-ghost inline-flex cursor-pointer !py-1.5 text-sm">
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
                <button type="submit" disabled={basicsPending} className="btn-primary !py-2.5">
                  {basicsPending ? "Saving…" : "Continue"}
                </button>
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={onSubmitEducation}>
              <h2 className="mb-1 font-display text-2xl italic tracking-[-0.02em]">
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
                <button type="submit" disabled={eduPending} className="btn-primary !py-2.5">
                  {eduPending ? "Saving…" : "Continue"}
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={onSubmitExperience}>
              <h2 className="mb-1 font-display text-2xl italic tracking-[-0.02em]">
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
                <button type="submit" disabled={expPending} className="btn-primary !py-2.5">
                  {expPending ? "Saving…" : "Continue"}
                </button>
              </div>
            </form>
          )}

          {step === 4 && (
            <>
              <form
                onSubmit={onSubmitIntake}
                className={diagnosing ? "hidden" : undefined}
                aria-hidden={diagnosing}
              >
                <h2 className="mb-1 font-display text-2xl italic tracking-[-0.02em]">
                  Where are you stuck?
                </h2>
                <p className="mb-4 text-sm text-[var(--ink-muted)]">
                  Honest answers get you a path that fits. Not a generic dashboard.
                </p>

                {intakeState.error && (
                  <p role="alert" className="mb-3 text-sm text-[var(--danger)]">
                    {intakeState.error}
                  </p>
                )}
                {intakeState.overCap && (
                  <div className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--featured-surface)] px-4 py-3 text-sm">
                    <p className="text-[var(--ink)]">
                      You&apos;ve used today&apos;s free diagnosis.
                    </p>
                    <Link href="/pro" className="mt-1 inline-block text-[var(--ink-muted)] underline">
                      Go Pro for more diagnoses
                    </Link>
                  </div>
                )}

                <div className="flex flex-col gap-5">
                  <fieldset>
                    <legend className={label}>Stage</legend>
                    <div className="mt-2 flex flex-col gap-2">
                      {STAGE_OPTIONS.map((opt) => (
                        <label
                          key={opt.value}
                          className="flex cursor-pointer items-center gap-2 text-sm text-[var(--ink)]"
                        >
                          <input
                            type="radio"
                            name="stage"
                            value={opt.value}
                            required
                            className="accent-[var(--blue)]"
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset>
                    <legend className={label}>What shapes your search? (optional)</legend>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {CONSTRAINT_OPTIONS.map((opt) => (
                        <label
                          key={opt.value}
                          className="flex cursor-pointer items-center gap-2 text-sm text-[var(--ink)]"
                        >
                          <input
                            type="checkbox"
                            name="constraints"
                            value={opt.value}
                            className="accent-[var(--blue)]"
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <div>
                    <label htmlFor="target_roles" className={label}>
                      Target roles
                    </label>
                    <input
                      id="target_roles"
                      name="target_roles"
                      type="text"
                      maxLength={240}
                      placeholder="e.g. SWE intern, data analyst"
                      className={field}
                    />
                    <p className="mt-1 text-xs text-[var(--ink-muted)]">Comma-separated</p>
                  </div>

                  <div>
                    <label htmlFor="target_companies" className={label}>
                      Target companies
                    </label>
                    <input
                      id="target_companies"
                      name="target_companies"
                      type="text"
                      maxLength={240}
                      placeholder="e.g. Stripe, local startups"
                      className={field}
                    />
                    <p className="mt-1 text-xs text-[var(--ink-muted)]">Comma-separated</p>
                  </div>

                  <fieldset>
                    <legend className={label}>Timeline</legend>
                    <div className="mt-2 flex flex-col gap-2">
                      {TIMELINE_OPTIONS.map((opt) => (
                        <label
                          key={opt.value}
                          className="flex cursor-pointer items-center gap-2 text-sm text-[var(--ink)]"
                        >
                          <input
                            type="radio"
                            name="timeline"
                            value={opt.value}
                            required
                            className="accent-[var(--blue)]"
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <div>
                    <label htmlFor="blocker" className={label}>
                      Main blocker right now
                    </label>
                    <textarea
                      id="blocker"
                      name="blocker"
                      required
                      rows={3}
                      maxLength={400}
                      placeholder="e.g. No projects to show, freezing on applications, no referrals"
                      className={`${field} resize-y`}
                    />
                  </div>

                  <div>
                    <label htmlFor="resume_or_projects" className={label}>
                      Resume or projects (optional)
                    </label>
                    <textarea
                      id="resume_or_projects"
                      name="resume_or_projects"
                      rows={3}
                      maxLength={2000}
                      placeholder="Paste a short resume blurb or list what you've built"
                      className={`${field} resize-y`}
                    />
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    disabled={intakePending || diagnosing}
                    className="btn-ghost"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={intakePending || diagnosing}
                    className="btn-primary !py-2.5"
                  >
                    {intakePending || diagnosing ? "Diagnosing…" : "Diagnose my path"}
                  </button>
                </div>
              </form>

              {diagnosing && (
                <div className="py-6 text-center" aria-live="polite">
                  <motion.div
                    className="mx-auto mb-5 h-1.5 w-28 overflow-hidden rounded-full bg-[var(--featured-surface)]"
                    aria-hidden
                  >
                    <motion.div
                      className="h-full w-2/5 rounded-full bg-[var(--blue)]"
                      initial={reduce ? undefined : { x: "-120%" }}
                      animate={reduce ? undefined : { x: "220%" }}
                      transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </motion.div>
                  <h2 className="font-display text-2xl italic tracking-[-0.02em] text-[var(--ink)]">
                    Building your path
                  </h2>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--ink-muted)]">
                    Reading where you are, naming the blocker, and choosing a home that fits.
                  </p>
                </div>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
