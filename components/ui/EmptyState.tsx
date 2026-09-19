import Link from "next/link";
import { CircleHelp } from "lucide-react";

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
    <div className="empty-enter card px-6 py-14 text-center sm:py-16" role="status">
      <div
        className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--featured-surface)] text-[var(--ink-muted)]"
        aria-hidden
      >
        <CircleHelp size={20} strokeWidth={1.5} />
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
