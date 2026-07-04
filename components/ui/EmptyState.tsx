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
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] px-6 py-14 text-center">
      <p className="font-medium text-[var(--ink)]">{title}</p>
      {description && <p className="mt-1.5 text-sm text-[var(--ink-muted)]">{description}</p>}
      {action && (
        <Link
          href={action.href}
          className="mt-4 inline-block rounded-md border border-[var(--border-strong)] px-4 py-1.5 text-sm font-medium transition hover:bg-[var(--featured-surface)]"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
