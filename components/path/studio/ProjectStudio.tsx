"use client";

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { SegmentedControl } from "@/components/interior/SegmentedControl";
import { TechIcon } from "@/components/tech";
import ProjectChecklist from "@/components/path/ProjectChecklist";
import StudioFilePane from "@/components/path/studio/StudioFilePane";
import StudioUiPreview from "@/components/path/studio/StudioUiPreview";
import { useStudioDesktop } from "@/components/path/studio/useStudioDesktop";
import { useStudioWorkspace } from "@/components/path/studio/useStudioWorkspace";
import type { DossierExperienceDraft } from "@/lib/path/dossier-draft";
import type { ProjectWorkspaceSnapshot } from "@/lib/path/studio/workspace";
import type { PathProject, StudioManifest, StudioMilestone } from "@/lib/path/types";

type MobileTab = "build" | "files" | "preview" | "evidence";
type SideTab = "preview" | "tests";

const MOBILE_TABS: { id: MobileTab; label: string }[] = [
  { id: "build", label: "Build" },
  { id: "files", label: "Files" },
  { id: "preview", label: "Preview" },
  { id: "evidence", label: "Evidence" },
];

function runtimeLabel(runtime: StudioManifest["runtime"]): string {
  return runtime === "remote_node" ? "Remote Node" : "Browser React";
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
                    ? `${testCount} test id${testCount === 1 ? "" : "s"} declared — runner not wired.`
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
  compact = false,
}: {
  milestones: StudioMilestone[];
  activeId: string;
  onSelect: (id: string) => void;
  checklistState: Record<string, boolean>;
  headingId?: string;
  compact?: boolean;
}) {
  const active = milestones.find((m) => m.id === activeId) ?? milestones[0];

  return (
    <section
      className={`studio-milestone-rail${compact ? " studio-milestone-rail-compact" : ""}`}
      aria-labelledby={headingId}
    >
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
                  {!compact ? (
                    <span className="studio-milestone-state">
                      {done ? "Checklist done" : "In progress"}
                    </span>
                  ) : null}
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

function SideTabs({
  active,
  onChange,
}: {
  active: SideTab;
  onChange: (tab: SideTab) => void;
}) {
  return (
    <div className="studio-side-tabs studio-seg-tabs">
      <SegmentedControl
        options={[
          { value: "preview", label: "Preview" },
          { value: "tests", label: "Tests" },
        ]}
        label="Preview and tests"
        value={active}
        onValueChange={(value) => onChange(value as SideTab)}
        className="w-full !block"
      />
    </div>
  );
}

function MobileTabList({
  active,
  onChange,
}: {
  active: MobileTab;
  onChange: (tab: MobileTab) => void;
}) {
  return (
    <div className="studio-mobile-tabs studio-seg-tabs">
      <SegmentedControl
        options={MOBILE_TABS.map((tab) => ({ value: tab.id, label: tab.label }))}
        label="Studio sections"
        value={active}
        onValueChange={(value) => onChange(value as MobileTab)}
        className="w-full !block"
      />
    </div>
  );
}

const MOBILE_PANEL_LABELS: Record<MobileTab, string> = {
  build: "Build",
  files: "Files",
  preview: "Preview",
  evidence: "Evidence",
};

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
      role="region"
      id={`studio-panel-${id}`}
      aria-label={MOBILE_PANEL_LABELS[id]}
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
  workspaceSnapshot = null,
}: {
  project: PathProject;
  manifest: StudioManifest;
  signedIn: boolean;
  initialDone?: Record<string, boolean>;
  dossierDraft: DossierExperienceDraft;
  inDossier: boolean;
  workspaceSnapshot?: ProjectWorkspaceSnapshot | null;
}) {
  const titleId = useId();
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>(
    () => initialDone ?? {},
  );
  const required = project.build_checklist.filter((item) => !item.optional);
  const requiredDone = required.filter((item) => checklistState[item.id]).length;
  const [activeMilestoneId, setActiveMilestoneId] = useState(
    () => manifest.milestones[0]?.id ?? "",
  );
  const [mobileTab, setMobileTab] = useState<MobileTab>("build");
  const [sideTab, setSideTab] = useState<SideTab>("preview");
  const isDesktop = useStudioDesktop();

  const workspace = useStudioWorkspace({
    projectSlug: project.slug,
    manifest,
    snapshot: workspaceSnapshot ?? null,
    canPersist: signedIn,
  });

  const selectedContent = workspace.selected?.content ?? "";
  const selectedReadOnly = workspace.selected?.readOnly ?? true;

  return (
    <div className="project-studio" data-runtime={manifest.runtime} data-mobile-tab={mobileTab}>
      <header className="studio-toolbar studio-toolbar-compact">
        <div className="studio-toolbar-row">
          <div className="studio-toolbar-identity">
            <span className="studio-toolbar-kicker">Project Studio</span>
            <h1 id={titleId} className="studio-toolbar-title">
              {project.title}
            </h1>
          </div>
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
            </span>
            <span className="studio-runtime-pill">{runtimeLabel(manifest.runtime)}</span>
          </p>
          <div className="studio-toolbar-actions">
            <Link href="/home" className="btn-ghost inline-flex">
              Back
            </Link>
            <a href="#build-checklist" className="btn-primary inline-flex studio-desktop-only">
              Checklist
            </a>
          </div>
        </div>
      </header>

      {!signedIn ? (
        <p className="studio-notice studio-notice-compact" role="status">
          Sign in to sync checklist and file checkpoints. Local checklist still saves in this
          browser.
        </p>
      ) : null}

      <div className="studio-desktop" aria-labelledby={titleId}>
        <MilestoneRail
          milestones={manifest.milestones}
          activeId={activeMilestoneId}
          onSelect={setActiveMilestoneId}
          checklistState={checklistState}
          compact
        />
        <StudioFilePane
          entryFile={manifest.entryFile}
          visibleFiles={manifest.visibleFiles}
          selectedPath={workspace.selectedPath}
          onSelectPath={workspace.setSelectedPath}
          content={selectedContent}
          readOnly={selectedReadOnly}
          editable={isDesktop}
          saveStatus={workspace.saveStatus}
          saveMessage={workspace.saveMessage}
          onContentChange={workspace.updateFileContent}
        />
        <div className="studio-right-rail">
          <SideTabs active={sideTab} onChange={setSideTab} />
          <div
            role="region"
            id="studio-side-panel-preview"
            aria-label="Preview"
            hidden={sideTab !== "preview"}
            className="studio-side-panel"
          >
            {isDesktop && sideTab === "preview" ? (
              <StudioUiPreview
                pageCode={workspace.pagePreviewCode}
                runtime={manifest.runtime}
              />
            ) : null}
          </div>
          <div
            role="region"
            id="studio-side-panel-tests"
            aria-label="Tests"
            hidden={sideTab !== "tests"}
            className="studio-side-panel"
          >
            {sideTab === "tests" ? (
              <StudioTests milestones={manifest.milestones} checklistState={checklistState} />
            ) : null}
          </div>
        </div>
      </div>

      <aside className="studio-brief studio-desktop-only" aria-label="Project brief">
        <p className="studio-panel-label">Brief</p>
        <BriefDetails project={project} />
      </aside>

      <div className="studio-mobile">
        <MobileTabList active={mobileTab} onChange={setMobileTab} />
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
            selectedPath={workspace.selectedPath}
            onSelectPath={workspace.setSelectedPath}
            content={selectedContent}
            readOnly
            editable={false}
            saveStatus={workspace.saveStatus}
            saveMessage={workspace.saveMessage}
            onContentChange={() => {}}
          />
          <p className="studio-mobile-handoff" role="note">
            Code is read-only on mobile. Continue on desktop to edit.
          </p>
        </MobilePanel>
        <MobilePanel id="preview" active={mobileTab}>
          {!isDesktop ? (
            <StudioUiPreview
              pageCode={workspace.pagePreviewCode}
              runtime={manifest.runtime}
              headingId="studio-preview-heading-mobile"
            />
          ) : null}
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
