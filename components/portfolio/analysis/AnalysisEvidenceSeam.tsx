import type { AnalysisEvidenceView } from "@/lib/portfolio/analysis-ui";

export default function AnalysisEvidenceSeam({
  view,
  embedded = false,
}: {
  view: AnalysisEvidenceView;
  embedded?: boolean;
}) {
  return (
    <section
      className={embedded ? "mt-2" : "card mb-4 px-5 py-4"}
      aria-labelledby="analysis-evidence-heading"
    >
      <h2 id="analysis-evidence-heading" className="text-sm font-semibold text-[var(--ink)]">
        Analysis evidence
      </h2>
      <p className="mt-1 text-xs text-[var(--ink-faint)]">
        Read-only source from GitHub analysis. Saving this project does not change it or publish it.
      </p>
      {view.repositoryFullName ? (
        <p className="mt-3 max-w-[390px] text-sm break-all text-[var(--ink)] [overflow-wrap:anywhere]">
          {view.repositoryFullName}
          {view.commitSha ? <span className="text-[var(--ink-muted)]"> · {view.commitSha.slice(0, 7)}</span> : null}
        </p>
      ) : null}
      {view.coverageFacts.length > 0 ? (
        <ul className="mt-3 flex max-w-[390px] flex-col gap-1 text-sm break-all text-[var(--ink-muted)] [overflow-wrap:anywhere]">
          {view.coverageFacts.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-[var(--ink-muted)]">No coverage details were saved with this analysis.</p>
      )}
      {view.uncertaintyNotes.length > 0 ? (
        <div className="mt-4 max-w-[390px]">
          <h3 className="text-xs font-medium uppercase tracking-[0.04em] text-[var(--ink-faint)]">Uncertainty</h3>
          <ul className="mt-1 flex flex-col gap-1 text-sm break-all text-[var(--ink-muted)] [overflow-wrap:anywhere]">
            {view.uncertaintyNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {view.evidence.length > 0 ? (
        <div className="mt-4 max-w-[390px]">
          <h3 className="text-xs font-medium uppercase tracking-[0.04em] text-[var(--ink-faint)]">Source files</h3>
          <ul className="mt-1 flex flex-col gap-2 text-sm">
            {view.evidence.map((item) => (
              <li key={item.path} className="min-w-0">
                <p className="font-medium break-all text-[var(--ink)] [overflow-wrap:anywhere]">{item.path}</p>
                {item.excerpt ? (
                  <p className="mt-0.5 whitespace-pre-wrap break-all text-[var(--ink-muted)] [overflow-wrap:anywhere]">
                    {item.excerpt}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
