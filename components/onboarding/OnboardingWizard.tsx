"use client";

import { useActionState, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
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
import {
  saveOnboardingBasics,
  saveOnboardingStage,
  finishOnboarding,
  savePortfolioConsent,
} from "@/app/(app)/onboarding/actions";
import AvatarBase from "@/components/ui/Avatar";
import { LightPool } from "@/components/ui/Backdrop";
import { Button } from "@/components/ui/Button";
import { StageDot } from "@/components/ui/Chip";
import { MonoLabel } from "@/components/ui/MonoLabel";
import SchoolAutocomplete from "@/components/profile/SchoolAutocomplete";
import DateRangePicker from "@/components/profile/DateRangePicker";
import Select from "@/components/ui/Select";
import { DEGREE_OPTIONS } from "@/lib/education-options";
import type { OnboardingStep } from "@/lib/onboarding";
import { FOCUS_AREAS, FOCUS_LABELS, MAX_FOCUS_AREAS, STAGES, STAGE_LABELS, type FocusArea, type Stage } from "@/lib/stage";
import { OPEN_TO_TAGS } from "@/lib/portfolio/validation";
import { OPEN_TO_LABELS } from "@/lib/portfolio/labels";

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

const TOTAL_STEPS = 6;
const label = "block text-[13px] font-medium text-[var(--ink-3)]";
const field = "input-base mt-1.5";
const formClass = "mt-7 flex flex-col gap-8 md:mt-9 md:gap-9";
const alertClass = "rounded-xl border border-[var(--hairline-strong)] bg-white/[0.03] px-3 py-2 text-sm text-[var(--ink)]";
const choiceChip =
  "inline-flex h-11 cursor-pointer select-none items-center rounded-full border border-white/10 bg-white/[0.03] px-3.5 text-sm font-medium text-[var(--ink-3)] transition-[background-color,border-color,color,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-95 has-[:checked]:border-[var(--ink)] has-[:checked]:bg-[var(--ink)] has-[:checked]:text-[var(--bg)] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--accent)] motion-reduce:transition-none motion-reduce:active:scale-100 md:h-9";
const STAGE_HINTS: Record<Stage, string> = {
  learning: "Intro courses, first languages, first bugs.",
  building: "Side projects, hackathons, shipping things.",
  internship_search: "Resumes, OAs, interviews, rejections.",
  interning: "On a team for the season.",
  job_search: "New grad search, offers, deadlines.",
  working: "Shipping at work, helping people behind you.",
};

type StepIntroProps = { step: number; title: string; accent: string; sub: ReactNode };

function StepIntro({ step, title, accent, sub }: StepIntroProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  // StepIntro remounts on every step swap (AnimatePresence is keyed on step).
  // Moving focus to the new heading lets screen readers announce the step.
  // Step 1 is only ever the first render (there is no Back), so it never steals focus.
  useEffect(() => {
    if (step > 1) headingRef.current?.focus();
  }, [step]);
  return (
    <div className="flex flex-col gap-3">
      <MonoLabel as="p" size="sm">
        Step {step} of {TOTAL_STEPS} · Optional
      </MonoLabel>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="text-[34px] font-semibold leading-[1.02] tracking-[-0.04em] text-balance outline-none md:text-[52px] md:leading-none"
      >
        {title}{" "}
        <span className="font-serif font-normal italic tracking-[-0.02em] text-[var(--accent-ink)]">{accent}</span>
      </h1>
      <p className="text-[15px] text-[var(--muted)] text-pretty md:text-[17px]">{sub}</p>
    </div>
  );
}

type StepFooterProps = { hint?: ReactNode; children: ReactNode };

// Sticky above the phone bottom nav (MobileNav: 60px links + 1px border, plus the safe area);
// the negative margins cancel the shell gutter (px-4, sm:px-6) so the bar spans the screen.
function StepFooter({ hint, children }: StepFooterProps) {
  return (
    <div className="z-10 mt-2 flex flex-col gap-2.5 max-md:sticky max-md:bottom-[calc(61px+env(safe-area-inset-bottom))] max-md:-mx-4 max-md:border-t max-md:border-[var(--hairline)] max-md:bg-[var(--bg)]/90 max-md:px-4 max-md:py-4 max-md:backdrop-blur-sm sm:max-md:-mx-6 sm:max-md:px-6 md:flex-row md:items-center md:justify-between md:pt-2">
      {hint ? (
        <p className="text-center text-[13px] text-[var(--muted)] text-pretty md:text-left md:text-sm">{hint}</p>
      ) : (
        <span className="hidden md:block" />
      )}
      <div className="flex items-center gap-2 md:justify-end">{children}</div>
    </div>
  );
}

export default function OnboardingWizard({ profile }: { profile: OnboardingProfile }) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [stepsDone, setStepsDone] = useState<OnboardingStep[]>([]);
  const markDone = (s: OnboardingStep) => setStepsDone((prev) => (prev.includes(s) ? prev : [...prev, s]));
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

  const [stage, setStage] = useState<Stage | "">("");
  const [focus, setFocus] = useState<FocusArea[]>([]);
  const [stagePending, startStage] = useTransition();
  const [stageFormError, setStageFormError] = useState<string | undefined>();

  function toggleFocus(area: FocusArea) {
    setFocus((cur) =>
      cur.includes(area) ? cur.filter((a) => a !== area) : cur.length >= MAX_FOCUS_AREAS ? cur : [...cur, area],
    );
  }

  function onSubmitStage(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!stage) return;
    const fd = new FormData(e.currentTarget);
    setStageFormError(undefined);
    startStage(async () => {
      const result = await saveOnboardingStage({}, fd);
      if (result.error) setStageFormError(result.error);
      else setStep(2);
    });
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
      else {
        markDone("basics");
        setStep(3);
      }
    });
  }

  const [postContent, setPostContent] = useState("");
  const [postPending, startPost] = useTransition();
  const [postError, setPostError] = useState<string | undefined>();
  const [finishing, startFinish] = useTransition();

  function onFinish() {
    startFinish(async () => {
      await finishOnboarding(stepsDone);
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
      else {
        markDone("post");
        setStep(4);
      }
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
      else {
        markDone("education");
        setStep(5);
      }
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
      else {
        markDone("experience");
        setStep(6);
      }
    });
  }

  const [publishPending, startPublish] = useTransition();
  const [publishError, setPublishError] = useState<string | undefined>();

  function onSubmitPublish(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPublishError(undefined);
    startPublish(async () => {
      const result = await savePortfolioConsent({}, fd);
      if (result.error) setPublishError(result.error);
      else await finishOnboarding(stepsDone);
    });
  }

  return (
    <main className="relative isolate mx-auto w-full max-w-[880px] pb-6 md:pb-12">
      {/* Clips the wide pool sideways only, at the screen edges (the negative inset cancels the shell gutter),
          so it never scrolls the page and the sticky footer can still bleed to the edges. */}
      <div aria-hidden className="pointer-events-none absolute -inset-x-4 top-0 -z-10 overflow-x-clip sm:-inset-x-6">
        <LightPool className="-top-[240px] left-1/2 h-[480px] w-[600px] -translate-x-1/2 md:-top-[360px] md:h-[700px] md:w-[1100px]" />
      </div>
      <header className="flex h-14 items-center justify-between md:h-16">
        <div
          role="progressbar"
          aria-label="Setup progress"
          aria-valuemin={1}
          aria-valuemax={TOTAL_STEPS}
          aria-valuenow={step}
          aria-valuetext={`Step ${step} of ${TOTAL_STEPS}`}
          className="flex gap-[5px] md:gap-1.5"
        >
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <span
              key={i}
              className={`h-1 w-[22px] rounded-full transition-colors duration-200 md:w-7 ${i < step ? "bg-[var(--ink)]" : "bg-[var(--hairline-strong)]"}`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={onFinish}
          disabled={finishing}
          className="inline-flex min-h-11 items-center text-sm text-[var(--muted)] hover:text-[var(--ink)] disabled:opacity-50"
        >
          Skip
        </button>
      </header>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          className="pt-7 md:pt-14"
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -4 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        >
        {step === 1 && (
          <>
          <StepIntro
            step={1}
            title="Where are you"
            accent="right now?"
            sub="We use this to show you people at the same stage. Change it any time."
          />
          <form onSubmit={onSubmitStage} className={formClass}>
            {stageFormError && <p role="alert" className={alertClass}>{stageFormError}</p>}
            <fieldset>
              <legend className="sr-only">Your stage</legend>
              <div className="flex flex-col gap-2 sm:grid sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
                {STAGES.map((s) => (
                  <label
                    key={s}
                    className="group flex min-h-14 cursor-pointer items-center gap-3 rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3.5 transition-[transform,border-color,background-color] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-white/15 active:scale-[0.98] has-[:checked]:border-[rgba(79,159,232,0.55)] has-[:checked]:bg-[rgba(79,159,232,0.08)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--accent)] motion-reduce:transition-none motion-reduce:active:scale-100 sm:grid sm:grid-cols-[1fr_auto] sm:content-start sm:items-start sm:gap-2 sm:rounded-[18px] sm:p-[18px] sm:active:scale-[0.97]"
                  >
                    <input
                      type="radio"
                      name="stage"
                      value={s}
                      checked={stage === s}
                      onChange={() => setStage(s)}
                      aria-describedby={`stage-hint-${s}`}
                      className="sr-only"
                    />
                    <StageDot stage={s} size="md" className="sm:col-start-1 sm:row-start-1 sm:self-center" />
                    <span className="flex-1 text-base font-medium sm:col-span-2 sm:row-start-2 sm:text-[17px] sm:font-semibold sm:tracking-[-0.01em]">
                      {STAGE_LABELS[s]}
                    </span>
                    <span id={`stage-hint-${s}`} className="hidden text-[13px] leading-[1.45] text-[var(--muted)] text-pretty sm:col-span-2 sm:row-start-3 sm:block">
                      {STAGE_HINTS[s]}
                    </span>
                    <span
                      aria-hidden
                      className="grid size-5 shrink-0 place-items-center rounded-full border-[1.5px] border-white/20 group-has-[:checked]:border-[var(--accent)] sm:col-start-2 sm:row-start-1 sm:size-[18px]"
                    >
                      <span className="size-2 rounded-full bg-[var(--accent)] opacity-0 group-has-[:checked]:opacity-100" />
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="text-sm text-[var(--ink-3)]">
                Focus areas{" "}
                <span className="text-[var(--faint)]">
                  · pick up to {MAX_FOCUS_AREAS} (
                  <span aria-live="polite" className="tabular-nums">
                    {focus.length}/{MAX_FOCUS_AREAS}
                  </span>
                  )
                </span>
              </legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {FOCUS_AREAS.map((a) => (
                  <label key={a} className={choiceChip}>
                    <input
                      type="checkbox"
                      name="focus_areas"
                      value={a}
                      checked={focus.includes(a)}
                      onChange={() => toggleFocus(a)}
                      disabled={!focus.includes(a) && focus.length >= MAX_FOCUS_AREAS}
                      className="sr-only"
                    />
                    {FOCUS_LABELS[a]}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="text-sm text-[var(--ink-3)]">Open to</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {OPEN_TO_TAGS.map((tag) => (
                  <label key={tag} className={choiceChip}>
                    <input type="checkbox" name="open_to" value={tag} className="sr-only" />
                    {OPEN_TO_LABELS[tag]}
                  </label>
                ))}
              </div>
            </fieldset>
            <StepFooter
              hint={stage ? `You will see students who are ${STAGE_LABELS[stage].toLowerCase()} first.` : "Pick one to continue."}
            >
              <Button variant="ghost" size="lg" onClick={() => setStep(2)}>
                Skip for now
              </Button>
              <Button type="submit" variant="primary" size="lg" disabled={stagePending || !stage} className="max-md:flex-1">
                {stagePending ? "Saving…" : "Continue"}
              </Button>
            </StepFooter>
          </form>
          </>
        )}

        {step === 2 && (
          <>
          <StepIntro step={2} title="Set up your" accent="profile" sub="A photo, your name, and one line about you." />
          <form onSubmit={onSubmitBasics} className={formClass}>
            <div className="flex max-w-xl flex-col gap-4">
              {basicsError && <p role="alert" className={alertClass}>{basicsError}</p>}
              <div className="flex items-center gap-4 border-b border-[var(--hairline)] pb-6">
                <AvatarBase
                  src={avatarUrl}
                  seed={profile.username}
                  name={profile.display_name ?? profile.username}
                  className="h-16 w-16 shrink-0 rounded-full border border-[var(--border)] text-xl"
                />
                <div>
                  <label className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-[var(--hairline-strong)] px-4 text-sm text-[var(--ink)] transition-transform active:scale-[0.96] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--accent)] has-[:disabled]:opacity-50 motion-reduce:transition-none md:min-h-9">
                    <input type="file" accept="image/*" onChange={onAvatar} disabled={avatarBusy} className="sr-only" />
                    {avatarBusy ? "Uploading…" : "Add a photo"}
                  </label>
                  <p className={avatarState.error ? "mt-1.5 text-xs text-[var(--danger)]" : "mt-1.5 text-xs text-[var(--muted)]"}>
                    {avatarState.error ?? "JPG, PNG, or WebP. Max 2 MB."}
                  </p>
                </div>
              </div>
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
            <StepFooter>
              <Button variant="ghost" size="lg" onClick={() => setStep(3)}>
                Skip for now
              </Button>
              <Button type="submit" variant="primary" size="lg" disabled={basicsPending} className="max-md:flex-1">
                {basicsPending ? "Saving…" : "Continue"}
              </Button>
            </StepFooter>
          </form>
          </>
        )}

        {step === 3 && (
          <>
          <StepIntro step={3} title="Post something" accent="real" sub="Optional. What are you building or figuring out?" />
          <form onSubmit={onSubmitPost} className={formClass}>
            <div className="flex max-w-xl flex-col gap-4">
              {postError && <p role="alert" className={alertClass}>{postError}</p>}
              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                rows={4}
                maxLength={280}
                placeholder="Share what you're building…"
                className="input-base w-full resize-y !rounded-2xl p-3 text-[15px] leading-[1.55]"
              />
            </div>
            <StepFooter>
              <Button variant="ghost" size="lg" onClick={() => setStep(4)} disabled={postPending}>
                Skip
              </Button>
              <Button type="submit" variant="primary" size="lg" disabled={postPending || postContent.trim().length === 0} className="max-md:flex-1">
                {postPending ? "Posting…" : "Post & continue"}
              </Button>
            </StepFooter>
          </form>
          </>
        )}

        {step === 4 && (
          <>
          <StepIntro step={4} title="Add your" accent="education" sub="Where do you study? Optional." />
          <form onSubmit={onSubmitEducation} className={formClass}>
            <div className="flex max-w-xl flex-col gap-4">
              {eduError && <p role="alert" className={alertClass}>{eduError}</p>}
              <div>
                <label htmlFor="edu-school" className={label}>School</label>
                <SchoolAutocomplete id="edu-school" name="school" domainName="school_domain" maxLength={100}
                  placeholder="Your university" className={field} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <StepFooter>
              <Button variant="ghost" size="lg" onClick={() => setStep(5)} disabled={eduPending}>
                Skip
              </Button>
              <Button type="submit" variant="primary" size="lg" disabled={eduPending} className="max-md:flex-1">
                {eduPending ? "Saving…" : "Add & continue"}
              </Button>
            </StepFooter>
          </form>
          </>
        )}

        {step === 5 && (
          <>
          <StepIntro step={5} title="Add an" accent="experience" sub="Interned somewhere? Led a club? Optional." />
          <form onSubmit={onSubmitExperience} className={formClass}>
            <div className="flex max-w-xl flex-col gap-4">
              {expError && <p role="alert" className={alertClass}>{expError}</p>}
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
            <StepFooter>
              <Button variant="ghost" size="lg" onClick={() => setStep(6)} disabled={expPending || finishing}>
                Skip
              </Button>
              <Button type="submit" variant="primary" size="lg" disabled={expPending || finishing} className="max-md:flex-1">
                {expPending || finishing ? "Saving…" : "Add & continue"}
              </Button>
            </StepFooter>
          </form>
          </>
        )}

        {step === 6 && (
          <>
          <StepIntro
            step={6}
            title="Make your portfolio"
            accent="public"
            sub={
              <>
                Your link samehere.dev/profile/{profile.username} shows your intro, projects, experience, and education.
                Activity and posts stay private. You can change this anytime in Edit profile.
              </>
            }
          />
          <form onSubmit={onSubmitPublish} className={formClass}>
            <div className="flex max-w-xl flex-col gap-4">
              {publishError && <p role="alert" className={alertClass}>{publishError}</p>}
              <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-[var(--hairline)] bg-[var(--surface-2)] px-4 text-[15px] text-[var(--ink)] has-[:checked]:border-[rgba(79,159,232,0.55)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--accent)]">
                <input type="checkbox" name="publish_portfolio" defaultChecked className="size-4 accent-[var(--accent)]" />
                Make my portfolio public
              </label>
            </div>
            <StepFooter>
              <Button type="submit" variant="primary" size="lg" disabled={publishPending || finishing} className="max-md:flex-1">
                {publishPending || finishing ? "Saving…" : "Finish"}
              </Button>
            </StepFooter>
          </form>
          </>
        )}
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
