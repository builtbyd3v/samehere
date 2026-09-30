import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";

type EmptyAction = { label: string; href: string };

/** Calm empty state: title, one line, at most two actions. No icon unless the caller has a meaningful one. */
export default function EmptyState({
  title,
  description,
  action,
  secondaryAction,
  icon,
  children,
}: {
  title: string;
  description?: string;
  action?: EmptyAction;
  secondaryAction?: EmptyAction;
  icon?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="empty-enter rounded-[20px] border border-[var(--border)] px-6 py-12 text-center sm:py-14" role="status">
      {icon ? (
        <div aria-hidden className="mx-auto mb-4 grid size-10 place-items-center text-[var(--muted)]">
          {icon}
        </div>
      ) : null}
      <h2 className="text-section font-semibold text-[var(--ink)]">{title}</h2>
      {description && <p className="mx-auto mt-1.5 max-w-[48ch] text-pretty text-small text-[var(--muted)]">{description}</p>}
      {children}
      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action && (
            <Button href={action.href} variant="primary">
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button href={secondaryAction.href} variant="secondary">
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
