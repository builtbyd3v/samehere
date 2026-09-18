import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { loadOwnerAnalytics } from "@/lib/portfolio/metrics-read";
import type { PortfolioClient } from "@/lib/portfolio/client";

export type AnalyticsReady = {
  status: "ready";
  views: number;
  linkClicks: number;
  perProject: { projectId: string; title: string; clicks: number }[];
};

export type AnalyticsState =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "locked" }
  | { status: "empty" }
  | AnalyticsReady;

export function PortfolioAnalyticsFallback() {
  return <PortfolioAnalytics state={{ status: "loading" }} />;
}

export async function OwnerAnalyticsSection({
  client,
  ownerId,
  currentPro,
  titles,
}: {
  client: PortfolioClient;
  ownerId: string;
  currentPro: boolean;
  titles: Map<string, string>;
}) {
  return <PortfolioAnalytics state={await loadOwnerAnalytics(client, ownerId, currentPro, titles)} />;
}

export default function PortfolioAnalytics({ state }: { state: AnalyticsState }) {
  return (
    <section className="card mt-4 p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-[var(--blue)]" strokeWidth={1.75} aria-hidden />
        <h2 className="text-sm font-semibold text-[var(--ink)]">Portfolio analytics</h2>
      </div>
      <p className="mt-1 text-xs text-[var(--ink-muted)]">Last 30 days. Counts are views and link clicks, not unique people.</p>
      {state.status === "loading" && (
        <div className="mt-4 space-y-2" aria-busy="true">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-28" />
        </div>
      )}
      {state.status === "unavailable" && (
        <p role="status" className="mt-4 text-sm text-[var(--ink-muted)]">
          Analytics are unavailable right now.
        </p>
      )}
      {state.status === "locked" && (
        <p className="mt-4 text-sm text-[var(--ink-muted)]">
          30-day views and link clicks are a Pro perk. Your projects stay public.{" "}
          <Link href="/pro" className="text-[var(--blue)] underline-offset-2 hover:underline">
            View Pro
          </Link>
        </p>
      )}
      {state.status === "empty" && (
        <p role="status" className="mt-4 text-sm text-[var(--ink-muted)]">
          No public views or link clicks in the last 30 days.
        </p>
      )}
      {state.status === "ready" && (
        <div className="mt-4">
          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-3 py-2.5">
              <dt className="text-xs text-[var(--ink-muted)]">Views</dt>
              <dd className="mt-0.5 text-xl font-semibold tracking-[-0.02em] text-[var(--ink)]">
                {state.views.toLocaleString()}
              </dd>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-3 py-2.5">
              <dt className="text-xs text-[var(--ink-muted)]">Link clicks</dt>
              <dd className="mt-0.5 text-xl font-semibold tracking-[-0.02em] text-[var(--ink)]">
                {state.linkClicks.toLocaleString()}
              </dd>
            </div>
          </dl>
          {state.perProject.length > 0 && (
            <ul className="mt-3 divide-y divide-[var(--border)] border-t border-[var(--border)]">
              {state.perProject.map((row) => (
                <li key={row.projectId} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0 truncate text-[var(--ink)]">{row.title}</span>
                  <span className="shrink-0 text-[var(--ink-muted)]">{row.clicks.toLocaleString()} clicks</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
