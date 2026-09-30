import { parseContextLabel, type ContextLabel } from "@/lib/context-label";

export type FeedTab = "latest" | "stage" | "following";

/** Chip order on the feed. Composer still uses CONTEXT_LABELS. */
export const FEED_FILTER_LABELS = ["stuck", "learning", "building", "looking_for_team"] as const satisfies readonly ContextLabel[];

/** Following stays in seed mode until the viewer follows this many people. */
export const FOLLOWING_SEED_MAX = 5;

/** How many network labeled posts to show in the Following empty state. */
export const LABELED_SEED_LIMIT = 8;

export function feedPath(opts?: { tab?: FeedTab; label?: ContextLabel | null }): string {
  const label = opts?.label ?? null;
  if (label) return `/feed?label=${label}`;
  if (opts?.tab === "following") return "/feed?tab=following";
  if (opts?.tab === "stage") return "/feed?tab=stage";
  return "/feed";
}

export function parseFeedView(params: { tab?: string; label?: string }): {
  tab: FeedTab;
  label: ContextLabel | null;
} {
  const label = parseContextLabel(params.label);
  if (label) return { tab: "latest", label };
  const tab: FeedTab = params.tab === "following" || params.tab === "stage" ? params.tab : "latest";
  return { tab, label: null };
}

/** The underline tabs on /feed. "open" is the Stuck label filter, shown as "Open questions". */
export type FeedTabKey = FeedTab | "open";

export const FEED_TABS: readonly { key: FeedTabKey; label: string; short?: string; href: string }[] = [
  { key: "latest", label: "Latest", href: feedPath() },
  { key: "stage", label: "Your stage", href: feedPath({ tab: "stage" }) },
  { key: "following", label: "Following", href: feedPath({ tab: "following" }) },
  { key: "open", label: "Open questions", short: "Open", href: feedPath({ label: "stuck" }) },
];

/** Which tab is underlined. Other label filters (learning, building, team) underline none. */
export function activeFeedTab(view: { tab: FeedTab; label: ContextLabel | null }): FeedTabKey | null {
  if (view.label === "stuck") return "open";
  if (view.label) return null;
  return view.tab;
}

export function shouldSeedFollowing(followCount: number): boolean {
  return followCount < FOLLOWING_SEED_MAX;
}

export function stuckReplyPath(postId: string): string {
  return `/post/${postId}?reply=1`;
}
