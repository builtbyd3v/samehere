import type { CSSProperties } from "react";
import ApprovalCard from "./ApprovalCard";
import LoadingState from "./LoadingState";
import StreamingText from "./StreamingText";
import TaskRows from "./TaskRows";

const PIPELINE = ["Saved", "Applied", "Interview"] as const;

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

export default function AdaptiveWorkbench() {
  return (
    <section id="product" className="landing-workbench" aria-label="Adaptive path preview">
      <div className="landing-workbench-grid">
        <article className="landing-demo-panel landing-demo-diagnosis">
          <PanelHeader label="Diagnose" title="Find the real blocker" meta="intake" />
          <div className="landing-diagnosis-loader" aria-label="Building your path">
            <LoadingState label="Building your path" variant="Drive" />
          </div>
        </article>

        <article className="landing-demo-panel landing-demo-studio">
          <PanelHeader label="Build" title="This week&apos;s project" meta="studio" />
          <div className="mt-5">
            <TaskRows variant="Capsules" />
          </div>
        </article>

        <article className="landing-demo-panel landing-demo-ops">
          <PanelHeader label="Apply" title="Today&apos;s application" meta="ops desk" />
          <div className="landing-opportunity">
            <div>
              <p className="landing-opportunity-role">Software engineering intern</p>
              <p className="landing-opportunity-org">Target company · Summer role</p>
            </div>
            <span className="landing-fit">Strong fit</span>
          </div>
          <div className="landing-pipeline" aria-label="Application stages">
            {PIPELINE.map((label, index) => (
              <div key={label} className="landing-pipeline-stage">
                <span
                  aria-hidden
                  className="landing-pipeline-dot"
                  style={{ "--stage-index": index } as CSSProperties}
                />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="landing-demo-panel landing-demo-prep">
          <PanelHeader label="Prepare" title="Practice the real question" meta="prep room" />
          <div className="landing-demo-prep-content">
            <StreamingText compact />
          </div>
        </article>

        <article className="landing-demo-panel landing-demo-approval">
          <PanelHeader label="Adapt" title="Your stage changed" meta="approval" />
          <div className="mt-3">
            <ApprovalCard compact />
          </div>
        </article>
      </div>
      <p className="landing-preview-note">
        Product preview · The adaptive path coach is in early development.
      </p>
    </section>
  );
}
