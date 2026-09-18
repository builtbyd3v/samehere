import Link from "next/link";

export default function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="card px-6 py-16 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center">
        <svg viewBox="0 0 392 488" className="h-8 w-8 text-[var(--ink)] opacity-[0.12]" aria-hidden>
          <use href="/samehere-mark.svg#samehere-mark-path" fill="currentColor" />
        </svg>
      </div>
      <p className="mt-4 font-medium text-[var(--ink)]">{title}</p>
      {description && <p className="mt-1.5 text-sm text-[var(--ink-muted)]">{description}</p>}
      {action && (
        <Link href={action.href} className="btn-primary mt-5 inline-flex">
          {action.label}
        </Link>
      )}
    </div>
  );
}
