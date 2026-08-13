import type { ReactNode } from "react";

const WIDTHS = {
  narrow: "max-w-xl",
  medium: "max-w-2xl",
  wide: "max-w-3xl",
  full: "max-w-[1120px]",
  canvas: "max-w-none",
} as const;

export function AppPage({
  children,
  width = "wide",
  className = "",
}: {
  children: ReactNode;
  width?: keyof typeof WIDTHS;
  className?: string;
}) {
  const pad = width === "canvas" ? "flex min-h-0 flex-1 flex-col p-0" : "py-6 md:py-8";
  return (
    <main className={`page-enter mx-auto w-full ${WIDTHS[width]} ${pad} ${className}`}>
      {children}
    </main>
  );
}

export function AppPageHeader({
  kicker,
  title,
  description,
  action,
}: {
  kicker?: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="app-page-header">
      <div className="min-w-0">
        {kicker ? <p className="app-page-kicker">{kicker}</p> : null}
        <h1 className="app-page-title">{title}</h1>
        {description ? <div className="app-page-description">{description}</div> : null}
      </div>
      {action ? <div className="app-page-action">{action}</div> : null}
    </header>
  );
}

export function AppPanel({
  children,
  className = "",
  as = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
}) {
  const Component = as;
  return <Component className={`app-panel ${className}`}>{children}</Component>;
}

export function AppNotice({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "danger";
}) {
  return (
    <div className="app-notice" data-tone={tone} role={tone === "danger" ? "alert" : undefined}>
      {children}
    </div>
  );
}

export function AppEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <AppPanel className="app-empty-state">
      <p className="text-base font-medium tracking-[-0.02em] text-[var(--ink)]">{title}</p>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--ink-muted)]">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </AppPanel>
  );
}
