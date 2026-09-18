import Link from "next/link";

export default function EmptyState({
  title,
  description,
  action,
  secondaryAction,
  children,
}: {
  title: string;
  description?: string;
  action?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
  children?: React.ReactNode;
}) {
  return (
    <div className="card px-6 py-14 text-center sm:py-16" role="status">
      <div
        className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--featured-surface)] text-[var(--ink-muted)]"
        aria-hidden
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M9 10.5c0-1.4 1.2-2.5 3-2.5s3 1 3 2.2c0 1.6-1.8 1.9-2.6 3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="12" cy="16.2" r="0.9" fill="currentColor" />
        </svg>
      </div>
      <h2 className="mt-4 text-base font-medium text-[var(--ink)]">{title}</h2>
      {description && <p className="mt-1.5 text-sm text-[var(--ink-muted)]">{description}</p>}
      {children}
      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action && (
            <Link href={action.href} className="btn-primary inline-flex">
              {action.label}
            </Link>
          )}
          {secondaryAction && (
            <Link href={secondaryAction.href} className="btn-ghost inline-flex">
              {secondaryAction.label}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
