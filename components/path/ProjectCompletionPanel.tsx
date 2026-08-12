import Link from "next/link";

/** Strong completion state + next actions after the build checklist is done. */
export default function ProjectCompletionPanel() {
  return (
    <div
      role="status"
      className="mt-5 rounded-[var(--landing-radius-sm)] border border-[var(--accent-blue)] bg-[var(--accent-blue-soft)] px-4 py-4"
    >
      <p className="text-base font-medium tracking-[-0.02em] text-[var(--ink)]">
        Project complete — proof ready
      </p>
      <p className="mt-1 text-sm text-[var(--ink-muted)]">
        Add this build to your dossier, or return to your path for the next move.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href="/profile/edit" className="btn-primary">
          Update dossier
        </Link>
        <Link href="/home" className="btn-ghost">
          Return to path
        </Link>
      </div>
    </div>
  );
}
