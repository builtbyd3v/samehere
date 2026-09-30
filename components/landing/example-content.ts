import type { FeedPost } from "@/components/feed/PostCard";
import type { LandingExample } from "@/lib/landing/examples";

// Illustrative content for the landing. Honesty rule: never a realistic person or a real account.
// "example-student" breaks the username rule (^[a-z0-9_]{3,20}$), so it can never be a real user.

/** ponytail: a non-null viewer id makes ReactionRow render enabled with the on-state; the card is inert, so nothing can call Supabase. */
export const EXAMPLE_VIEWER_ID = "example-viewer";

/** Outside the component so the React purity lint accepts the clock read; LandingPage is a server render. */
export function twoHoursAgo(): string {
  return new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
}

export function examplePost(createdAt: string): FeedPost {
  return {
    id: "example",
    content: "Supabase RLS blocks my insert but the policy looks right. What am I missing?",
    created_at: createdAt,
    user_id: "example-author",
    media: [],
    hidden: false,
    context_label: "stuck",
    team_event_name: null,
    team_event_date: null,
    team_event_mode: null,
    resolved_at: null,
    resolved_comment_id: null,
    author: {
      username: "example-student",
      display_name: "Example student",
      avatar_url: null,
      is_private: false,
      is_pro: false,
      is_founder: false,
      is_campus_founder: false,
      verified_student: false,
      is_bot: false,
      stage: "building",
      profile_school: null,
    },
    // Only the viewer's own SameHere; no invented crowd.
    samehere_count: 1,
    repost_count: 0,
    comment_count: 0,
    mine_samehere: true,
    mine_repost: false,
    mine_bookmark: false,
  };
}

/** Shown only when no real account qualifies (all private, unpublished, or the fetch failed). Labeled "Example portfolio". */
export const EXAMPLE_PORTFOLIO: LandingExample = {
  username: "yourname",
  displayName: "Your name",
  avatarUrl: null,
  badges: { isPro: false, isFounder: false, isCampusFounder: false, isVerifiedStudent: false, isBot: false },
  headline: "Your headline, in one line",
  stage: "building",
  focusAreas: ["web"],
  schoolLine: null,
  openTo: [],
  links: { github: null, linkedin: null, website: null },
  project: {
    id: "example",
    owner_id: "example",
    title: "Your first project",
    summary: "What it does, in one line.",
    description: null,
    personal_role: null,
    technologies: ["TypeScript"],
    key_features: [],
    repo_url: null,
    demo_url: null,
    published_at: "2026-01-01T00:00:00.000Z",
    sort_order: 0,
  },
};

export const EXAMPLE_STUCK_SOLVED = "Why does my useEffect run twice?\nOnly in development. The production build runs it once.";
