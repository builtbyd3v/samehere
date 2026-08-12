"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addProjectToDossier } from "@/app/(app)/projects/actions";
import type { DossierExperienceDraft } from "@/lib/path/dossier-draft";

/** Strong completion state + next actions after the build checklist is done. */
export default function ProjectCompletionPanel({
  draft,
  inDossier,
  projectSlug,
  persistServer,
}: {
  draft: DossierExperienceDraft;
  inDossier: boolean;
  projectSlug: string;
  persistServer: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(inDossier);
  if (inDossier && !added) setAdded(true);

  function addToDossier() {
    setError(null);
    startTransition(async () => {
      const result = await addProjectToDossier(projectSlug);
      if (result.error) {
        setError(result.error);
        return;
      }
      setAdded(true);
      router.refresh();
    });
  }

  return (
    <div
      role="status"
      className="mt-5 rounded-[var(--landing-radius-sm)] border border-[var(--accent-blue)] bg-[var(--accent-blue-soft)] px-4 py-4"
    >
      <p className="text-base font-medium tracking-[-0.02em] text-[var(--ink)]">
        Project complete. Proof ready.
      </p>
      <p className="mt-1 text-sm text-[var(--ink-muted)]">
        {added
          ? "This build is on your dossier. Edit the wording anytime, or return to your path."
          : "These lines can go on your dossier. Save them, then edit if you want."}
      </p>
      {draft.bullets.length ? (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--ink)]">
          {draft.bullets.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 text-sm text-[var(--ink)]">
          {error}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-3">
        {added ? (
          <Link href="/profile/edit" className="btn-primary">
            Edit dossier
          </Link>
        ) : persistServer ? (
          <button type="button" className="btn-primary" disabled={pending} onClick={addToDossier}>
            {pending ? "Saving…" : "Add to dossier"}
          </button>
        ) : (
          <Link href="/login" className="btn-primary">
            Sign in to save
          </Link>
        )}
        <Link href="/home" className="btn-ghost">
          Return to path
        </Link>
      </div>
    </div>
  );
}
