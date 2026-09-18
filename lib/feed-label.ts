import { parseContextLabel, type ContextLabel } from "@/lib/context-label";

export type FeedTab = "latest" | "following";

/** Chip order on the feed. Composer still uses CONTEXT_LABELS. */
export const FEED_FILTER_LABELS = ["stuck", "learning", "building"] as const satisfies readonly ContextLabel[];

/** Following stays in seed mode until the viewer follows this many people. */
export const FOLLOWING_SEED_MAX = 5;

/** How many network labeled posts to show in the Following empty state. */
export const LABELED_SEED_LIMIT = 8;

export function feedPath(opts?: { tab?: FeedTab; label?: ContextLabel | null }): string {
  const label = opts?.label ?? null;
  if (label) return `/feed?label=${label}`;
  if (opts?.tab === "following") return "/feed?tab=following";
  return "/feed";
}

export function parseFeedView(params: { tab?: string; label?: string }): {
  tab: FeedTab;
  label: ContextLabel | null;
} {
  const label = parseContextLabel(params.label);
  if (label) return { tab: "latest", label };
  return { tab: params.tab === "following" ? "following" : "latest", label: null };
}

export function shouldSeedFollowing(followCount: number): boolean {
  return followCount < FOLLOWING_SEED_MAX;
}

export function stuckReplyPath(postId: string): string {
  return `/post/${postId}?reply=1`;
}
