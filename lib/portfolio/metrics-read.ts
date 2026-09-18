import { isPortfolioSchemaMissing } from "./errors";
import { metricWindowStart, metricsSecret, summarizeMetrics, type MetricRow } from "./metrics";
import type { AnalyticsState } from "@/components/portfolio/PortfolioAnalytics";
import type { PortfolioClient } from "./client";

export async function loadOwnerAnalytics(
  client: PortfolioClient,
  ownerId: string,
  currentPro: boolean,
  titles: Map<string, string>
): Promise<AnalyticsState> {
  if (!currentPro) return { status: "locked" };
  if (!metricsSecret()) return { status: "unavailable" };
  const { data, error } = await client
    .from("portfolio_daily_metrics")
    .select("owner_id, project_id, metric_date, view_count, click_count")
    .eq("owner_id", ownerId)
    .gte("metric_date", metricWindowStart())
    .returns<MetricRow[]>();
  if (error) {
    if (isPortfolioSchemaMissing(error)) return { status: "unavailable" };
    return { status: "unavailable" };
  }
  const summary = summarizeMetrics(data ?? []);
  if (summary.views === 0 && summary.linkClicks === 0) return { status: "empty" };
  return {
    status: "ready",
    views: summary.views,
    linkClicks: summary.linkClicks,
    perProject: summary.perProject.map((row) => ({
      projectId: row.projectId,
      title: titles.get(row.projectId) ?? "Project",
      clicks: row.clicks,
    })),
  };
}
