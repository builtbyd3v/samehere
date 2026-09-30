import type { LandingExample } from "@/lib/landing/examples";

// Illustrative content for the landing. Honesty rule: never a realistic person or a real account.

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

// ponytail: the hero example is StuckQuestion alone; the real PostCard pushed / to 317.4 kB gzip (cap for it was 285).
export const EXAMPLE_STUCK_OPEN = "Supabase RLS blocks my insert but the policy looks right. What am I missing?";

export const EXAMPLE_STUCK_SOLVED = "Why does my useEffect run twice?\nOnly in development. The production build runs it once.";
