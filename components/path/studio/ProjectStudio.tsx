"use client";

import Link from "next/link";
import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { TechIcon } from "@/components/tech";
import ProjectChecklist from "@/components/path/ProjectChecklist";
import StudioFilePane from "@/components/path/studio/StudioFilePane";
import type { DossierExperienceDraft } from "@/lib/path/dossier-draft";
import type { PathProject, StudioManifest, StudioMilestone } from "@/lib/path/types";

type MobileTab = "build" | "files" | "preview" | "evidence";

const MOBILE_TABS: { id: MobileTab; label: string }[] = [
  { id: "build", label: "Build" },
  { id: "files", label: "Files" },
  { id: "preview", label: "Preview" },
  { id: "evidence", label: "Evidence" },
];

function runtimeLabel(runtime: StudioManifest["runtime"]): string {
  return runtime === "remote_node" ? "Remote Node" : "Browser React";
}

function StudioPreview({
  manifest,
  headingId = "studio-preview-heading",
}: {
  manifest: StudioManifest;
  headingId?: string;
}) {
  const command = manifest.commands.preview;
  return (
    <section className="studio-preview" aria-labelledby={headingId}>
      <div className="studio-panel-label" id={headingId}>
        Preview
      </div>
      <div className="studio-browser-chrome" aria-hidden="true">
        <span className="studio-browser-dot" />
        <span className="studio-browser-dot" />
        <span className="studio-browser-dot" />
        <span className="studio-browser-url">
          {manifest.runtime === "remote_node"
            ? "preview unavailable · remote runtime"
            : "preview not started"}
        </span>
      </div>
      <div className="studio-empty-panel studio-preview-empty" role="status">
        <p className="studio-empty-title">Preview is not running</p>
        <p className="studio-empty-copy">
          {manifest.runtime === "remote_node"
            ? "This project needs a remote Node runtime. Wave 1 shows the workspace only — the live preview server is not started here, and this panel never fakes an app screenshot."
            : "Browser preview wiring lands in a later wave. This panel stays empty until a real runtime can serve the project."}
        </p>
        {command ? (
          <p className="studio-empty-meta">
            Declared preview command: <code>{command}</code>
          </p>
        ) : (
          <p className="studio-empty-meta">No preview command is declared on this manifest.</p>
        )}
      </div>
    </section>
  );
}

function StudioTests({
  milestones,
  checklistState,
  headingId = "studio-tests-heading",
}: {
  milestones: StudioMilestone[];
  checklistState: Record<string, boolean>;
  headingId?: string;
}) {
  const declared = milestones.reduce((sum, m) => sum + (m.testIds?.length ?? 0), 0);

  return (
    <section className="studio-tests" aria-labelledby={headingId}>
      <div className="studio-panel-head">
        <div className="studio-panel-label" id={headingId}>
          Tests
        </div>
        <span className="studio-panel-meta">
          {declared > 0 ? `${declared} declared · not executed` : "No tests declared"}
        </span>
      </div>
      {milestones.length === 0 ? (
        <div className="studio-empty-panel" role="status">
          <p className="studio-empty-title">No milestone tests</p>
          <p className="studio-empty-copy">This manifest does not declare milestone test ids yet.</p>
        </div>
      ) : (
        <ul className="studio-tests-list">
          {milestones.map((milestone) => {
            const testCount = milestone.testIds?.length ?? 0;
            const checklistDone = !!checklistState[milestone.checklistId];
            return (
              <li key={milestone.id} className="studio-tests-item">
                <div className="studio-tests-item-head">
                  <span className="studio-tests-title">{milestone.title}</span>
                  <span
                    className="studio-tests-status"
                    data-ready={checklistDone ? "checklist" : "pending"}
                  >
                    {checklistDone ? "Checklist marked" : "Checklist open"}
                  </span>
                </div>
                <p className="studio-tests-copy">
                  {testCount > 0
                    ? `${testCount} test id${testCount === 1 ? "" : "s"} declared — runner not wired in Wave 1.`
                    : "No test ids on this milestone. Acceptance criteria guide the checklist for now."}
                </p>
                {testCount > 0 ? (
                  <ul className="studio-tests-ids">
                    {milestone.testIds!.map((id) => (
                      <li key={id}>
                        <code>{id}</code>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function MilestoneRail({
  milestones,
  activeId,
  onSelect,
  checklistState,
  headingId = "studio-milestones-heading",
}: {
  milestones: StudioMilestone[];
  activeId: string;
  onSelect: (id: string) => void;
  checklistState: Record<string, boolean>;
  headingId?: string;
}) {
  const active = milestones.find((m) => m.id === activeId) ?? milestones[0];

  return (
    <section className="studio-milestone-rail" aria-labelledby={headingId}>
      <div className="studio-panel-label" id={headingId}>
        Milestones
      </div>
      <ol className="studio-milestone-list">
        {milestones.map((milestone, index) => {
          const done = !!checklistState[milestone.checklistId];
          return (
            <li key={milestone.id}>
              <button
                type="button"
                className="studio-milestone-btn"
                data-active={active?.id === milestone.id ? "true" : "false"}
                data-done={done ? "true" : "false"}
                onClick={() => onSelect(milestone.id)}
              >
                <span className="studio-milestone-index">{index + 1}</span>
                <span className="studio-milestone-text">
                  <span className="studio-milestone-title">{milestone.title}</span>
                  <span className="studio-milestone-state">
                    {done ? "Checklist done" : "In progress"}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {active ? (
        <div className="studio-acceptance" aria-live="polite">
          <p className="studio-acceptance-label">Acceptance</p>
          <ul>
            {active.acceptance.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function BriefDetails({ project }: { project: PathProject }) {
  return (
    <div className="studio-brief-stack">
      <details className="studio-brief-details">
        <summary>What you build</summary>
        <ul>
          {project.what_you_build.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </details>
      <details className="studio-brief-details">
        <summary>What it teaches</summary>
        <ul>
          {project.what_it_teaches.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </details>
      <details className="studio-brief-details">
        <summary>How it works</summary>
        <ol>
          {project.how_it_works.map((step) => (
            <li key={step.step}>
              <strong>
                {step.step}. {step.title}
              </strong>
              <p>{step.detail}</p>
            </li>
          ))}
        </ol>
      </details>
      {project.take_it_further && project.take_it_further.length > 0 ? (
        <details className="studio-brief-details">
          <summary>Take it further</summary>
          <ul>
            {project.take_it_further.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function MobileTabList({
  active,
  onChange,
  labelledBy,
}: {
  active: MobileTab;
  onChange: (tab: MobileTab) => void;
  labelledBy: string;
}) {
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = MOBILE_TABS.findIndex((tab) => tab.id === active);
    if (index < 0) return;
    let next = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      next = (index + 1) % MOBILE_TABS.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      next = (index - 1 + MOBILE_TABS.length) % MOBILE_TABS.length;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = MOBILE_TABS.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    onChange(MOBILE_TABS[next]!.id);
  }

  return (
    <div
      className="studio-mobile-tabs"
      role="tablist"
      aria-labelledby={labelledBy}
      onKeyDown={onKeyDown}
    >
      {MOBILE_TABS.map((tab) => {
        const selected = active === tab.id;
        const controls = tab.id === "evidence" ? "build-checklist" : `studio-panel-${tab.id}`;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`studio-tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={controls}
            tabIndex={selected ? 0 : -1}
            className="studio-mobile-tab"
            data-active={selected ? "true" : "false"}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function MobilePanel({
  id,
  active,
  children,
}: {
  id: MobileTab;
  active: MobileTab;
  children: ReactNode;
}) {
  const selected = active === id;
  return (
    <div
      role="tabpanel"
      id={`studio-panel-${id}`}
      aria-labelledby={`studio-tab-${id}`}
      hidden={!selected}
      className="studio-mobile-panel"
    >
      {selected ? children : null}
    </div>
  );
}

export default function ProjectStudio({
  project,
  manifest,
  signedIn,
  initialDone,
  dossierDraft,
  inDossier,
}: {
  project: PathProject;
  manifest: StudioManifest;
  signedIn: boolean;
  initialDone?: Record<string, boolean>;
  dossierDraft: DossierExperienceDraft;
  inDossier: boolean;
}) {
  const titleId = useId();
  const tabsLabelId = useId();
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>(
    () => initialDone ?? {},
  );
  const required = project.build_checklist.filter((item) => !item.optional);
  const requiredDone = required.filter((item) => checklistState[item.id]).length;
  const [activeMilestoneId, setActiveMilestoneId] = useState(
    () => manifest.milestones[0]?.id ?? "",
  );
  const [mobileTab, setMobileTab] = useState<MobileTab>("build");

  return (
    <div className="project-studio" data-runtime={manifest.runtime} data-mobile-tab={mobileTab}>
      <header className="studio-toolbar">
        <div className="studio-toolbar-main">
          <p className="studio-toolbar-kicker">Project Studio</p>
          <h1 id={titleId} className="studio-toolbar-title">
            {project.title}
          </h1>
          <p className="studio-toolbar-roi">{project.interview_roi}</p>
        </div>
        <div className="studio-toolbar-side">
          <ul className="studio-tech-list" aria-label="Technologies">
            {manifest.technologies.map((tech) => (
              <li key={tech}>
                <TechIcon label={tech} className="studio-tech-mark" />
              </li>
            ))}
          </ul>
          <p className="studio-check-status" aria-live="polite">
            <span className="studio-check-count">
              {requiredDone}/{required.length}
            </span>{" "}
            required checks
            <span className="studio-runtime-pill">{runtimeLabel(manifest.runtime)}</span>
          </p>
          <div className="studio-toolbar-actions">
            <Link href="/home" className="btn-ghost inline-flex">
              Back to path
            </Link>
            <a href="#build-checklist" className="btn-primary inline-flex studio-desktop-only">
              Open checklist
            </a>
          </div>
        </div>
      </header>

      {!signedIn ? (
        <p className="studio-notice" role="status">
          Sign in to sync checklist progress across devices. Local progress still saves in this
          browser.
        </p>
      ) : null}

      <div className="studio-desktop" aria-labelledby={titleId}>
        <MilestoneRail
          milestones={manifest.milestones}
          activeId={activeMilestoneId}
          onSelect={setActiveMilestoneId}
          checklistState={checklistState}
        />
        <StudioFilePane
          entryFile={manifest.entryFile}
          visibleFiles={manifest.visibleFiles}
          starterFiles={manifest.starterFiles}
        />
        <div className="studio-right-rail">
          <StudioPreview manifest={manifest} />
          <StudioTests milestones={manifest.milestones} checklistState={checklistState} />
        </div>
      </div>

      <aside className="studio-brief studio-desktop-only" aria-label="Project brief">
        <p className="studio-panel-label">Brief</p>
        <BriefDetails project={project} />
      </aside>

      <div className="studio-mobile">
        <p id={tabsLabelId} className="sr-only">
          Studio sections
        </p>
        <MobileTabList active={mobileTab} onChange={setMobileTab} labelledBy={tabsLabelId} />
        <MobilePanel id="build" active={mobileTab}>
          <MilestoneRail
            milestones={manifest.milestones}
            activeId={activeMilestoneId}
            onSelect={setActiveMilestoneId}
            checklistState={checklistState}
            headingId="studio-milestones-heading-mobile"
          />
          <BriefDetails project={project} />
        </MobilePanel>
        <MobilePanel id="files" active={mobileTab}>
          <StudioFilePane
            entryFile={manifest.entryFile}
            visibleFiles={manifest.visibleFiles}
            starterFiles={manifest.starterFiles}
          />
          <p className="studio-mobile-handoff" role="note">
            Code is read-only on mobile. Continue on desktop when you need the editable studio.
          </p>
        </MobilePanel>
        <MobilePanel id="preview" active={mobileTab}>
          <StudioPreview manifest={manifest} headingId="studio-preview-heading-mobile" />
          <StudioTests
            milestones={manifest.milestones}
            checklistState={checklistState}
            headingId="studio-tests-heading-mobile"
          />
        </MobilePanel>
      </div>

      <div id="build-checklist" className="studio-evidence" data-mobile-tab={mobileTab}>
        <ProjectChecklist
          projectSlug={project.slug}
          items={project.build_checklist}
          initialDone={initialDone}
          persistServer={signedIn}
          dossierDraft={dossierDraft}
          inDossier={inDossier}
          onStateChange={setChecklistState}
        />
      </div>
    </div>
  );
}
