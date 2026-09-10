"use client";

import { useEffect, useRef, useState } from "react";
import { FileCode, FileJson, FileText, Folder, Link2 } from "lucide-react";
import { usePrefersReducedMotion } from "@/lib/landing/usePrefersReducedMotion";
import AnalysisRows from "./AnalysisRows";
import DraftApproval from "./DraftApproval";
import GitHubMark from "./GitHubMark";
import LoadingState from "./LoadingState";
import { ghostCtaSm } from "./cta";

const EXAMPLE_REPO = "maya/campus-course-planner";
const EXAMPLE_PROFILE = "samehere.dev/profile/maya";
const EXAMPLE_SUMMARY =
  "Ranks campus sections by time conflicts so you can lock a term before add/drop.";
const EXAMPLE_ROLE = "Scheduler for my lab section";

const FILES = [
  {
    path: "README.md",
    kind: "md",
    excerpt: "# campus-course-planner\n\nDraft your term before add/drop week.",
  },
  {
    path: "package.json",
    kind: "json",
    excerpt: '{\n  "name": "campus-course-planner",\n  "private": true\n}',
  },
  {
    path: "src/app.ts",
    kind: "ts",
    excerpt: "export function planTerm(courses: Course[]) {\n  return rankByConflicts(courses);\n}",
  },
  {
    path: "src/schedule.ts",
    kind: "ts",
    excerpt: "export function findGaps(blocks: Block[]) {\n  return blocks.filter(isOpen);\n}",
  },
] as const;

const STAGES = [
  { id: "queued", label: "Queued" },
  { id: "reading_repository", label: "Reading repository" },
  { id: "analyzing", label: "Analyzing" },
  { id: "saving_draft", label: "Saving draft" },
  { id: "succeeded", label: "Draft ready" },
] as const;

const LAST_STAGE = STAGES.length - 1;
const STEP_MS = 1400;

function FileIcon({ kind }: { kind: string }) {
  const props = { size: 16, strokeWidth: 1.5, "aria-hidden": true } as const;
  if (kind === "json") return <FileJson {...props} />;
  if (kind === "ts") return <FileCode {...props} />;
  return <FileText {...props} />;
}

function PanelHeader({
  label,
  title,
  meta,
}: {
  label: string;
  title: string;
  meta: string;
}) {
  return (
    <header className="landing-demo-header">
      <div>
        <span className="landing-stage-mark">
          <span aria-hidden className="landing-stage-dot" />
          {label}
        </span>
        <h2>{title}</h2>
      </div>
      <span className="landing-demo-meta">{meta}</span>
    </header>
  );
}

export default function PortfolioDemo() {
  const reduceMotion = usePrefersReducedMotion();
  const rootRef = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const [role, setRole] = useState(EXAMPLE_ROLE);
  const displayStep = reduceMotion ? LAST_STAGE : step;
  const complete = displayStep >= LAST_STAGE;
  const fileIndex = Math.min(displayStep, FILES.length - 1);
  const activeStage = STAGES[displayStep];
  const selected = FILES[fileIndex];
  const analysisActive = displayStep >= 1 && displayStep < LAST_STAGE ? displayStep - 1 : -1;
  const analysisDone = complete ? 3 : Math.max(0, displayStep - 1);
  const analyzing = analysisActive >= 0;
  const motionLive = !reduceMotion && !paused;
  const loadingLabel = complete
    ? "Draft ready"
    : analysisActive === 0
      ? "Reading files"
      : analysisActive === 1
        ? "Writing a draft"
        : analysisActive === 2
          ? "Saving privately"
          : "Queued";

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    function syncPause() {
      const bounds = root?.getBoundingClientRect();
      const hidden =
        document.visibilityState === "hidden" ||
        !bounds ||
        bounds.bottom < 0 ||
        bounds.top > window.innerHeight;
      setPaused(Boolean(hidden));
    }

    const io = new IntersectionObserver(() => syncPause(), { threshold: 0.15 });
    io.observe(root);
    document.addEventListener("visibilitychange", syncPause);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", syncPause);
    };
  }, []);

  useEffect(() => {
    if (reduceMotion || paused || complete) return;
    const timer = window.setTimeout(() => {
      setStep((current) => Math.min(current + 1, LAST_STAGE));
    }, STEP_MS);
    return () => window.clearTimeout(timer);
  }, [complete, paused, reduceMotion, step]);

  return (
    <section
      ref={rootRef}
      className="landing-workbench"
      data-paused={paused || undefined}
      aria-label="Repository to portfolio preview"
    >
      <div className="landing-workbench-shell">
        <article className="landing-workbench-repo">
          <PanelHeader label="Select" title="A public repository" meta="Example" />
          <p className="landing-repo-name">
            <Folder size={16} strokeWidth={1.5} aria-hidden />
            <span>{EXAMPLE_REPO}</span>
          </p>
          <div className="landing-file-tree" aria-label="Example files">
            {FILES.map((file, index) => (
              <div
                key={file.path}
                className="landing-file-row"
                data-active={index === fileIndex}
              >
                <FileIcon kind={file.kind} />
                <span>{file.path}</span>
                <span>{file.kind}</span>
              </div>
            ))}
          </div>
          <pre
            className="landing-file-excerpt"
            data-scan={motionLive && analyzing ? "true" : undefined}
            aria-label="Selected file excerpt"
          >
            <code>{selected.excerpt}</code>
          </pre>
        </article>

        <div className="landing-workbench-main">
          <article className="landing-workbench-analysis">
            <PanelHeader label="Analyze" title="Understand your project" meta="Example" />
            <LoadingState label={loadingLabel} active={analyzing && motionLive} />
            <AnalysisRows
              activeIndex={analysisActive}
              completedCount={analysisDone}
              reduceMotion={Boolean(reduceMotion)}
              paused={paused}
            />
          </article>

          <article className="landing-workbench-project">
            <PanelHeader label="Edit" title="Make it yours" meta={activeStage.label} />
            <div className="landing-project-preview">
              {complete ? (
                <>
                  <div className="landing-project-card">
                    <p className="landing-project-role">{role}</p>
                    <h3>Campus course planner</h3>
                    <p>{EXAMPLE_SUMMARY}</p>
                    <div className="landing-project-tags">
                      <span>TypeScript</span>
                      <span>Next.js</span>
                    </div>
                    <ul className="landing-project-links">
                      <li>
                        <GitHubMark size={16} />
                        <span>github.com/{EXAMPLE_REPO}</span>
                      </li>
                      <li>
                        <Link2 size={16} strokeWidth={1.5} aria-hidden />
                        <span>{EXAMPLE_PROFILE}</span>
                      </li>
                    </ul>
                  </div>
                  <DraftApproval role={role} onRoleChange={setRole} />
                </>
              ) : (
                <p>Your project write-up appears here when the draft is ready.</p>
              )}
            </div>
          </article>
        </div>
      </div>
      <div className="landing-preview-row">
        <p className="landing-preview-note">Product preview</p>
        {!reduceMotion && complete ? (
          <button
            type="button"
            className={ghostCtaSm}
            onClick={() => {
              setRole(EXAMPLE_ROLE);
              setStep(0);
            }}
          >
            Replay
          </button>
        ) : null}
      </div>
    </section>
  );
}
