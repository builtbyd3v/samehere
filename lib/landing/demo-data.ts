import type { HeatmapDay } from "@/components/profile/ContributionHeatmap";

export type DemoPost = {
  id: string;
  name: string;
  username: string;
  school: string | null;
  avatarSeed: string;
  minutesAgo: number;
  content: string;
  likes: number;
  samehere: number;
  comments: number;
  reposts: number;
};

export type DemoProfile = {
  name: string;
  username: string;
  avatarSeed: string;
  school: string;
  year: string;
  major: string;
  bio: string;
  goals?: string;
  skills: string[];
  posts: number;
  followers: number;
  following: number;
  /** Shown under @username when school/year/major are empty (e.g. "Founder"). */
  role?: string;
  showFounderBadge?: boolean;
  showProBadge?: boolean;
};

export type DemoSuggestion = {
  name: string;
  username: string;
  avatarSeed: string;
  prompt: string;
};

export const DEMO_POSTS: DemoPost[] = [
  {
    id: "demo-1",
    name: "Priya Raman",
    username: "priyar",
    school: "UT Austin",
    avatarSeed: "priya-samehere",
    minutesAgo: 240,
    content: "Anyone else feel behind in CS even when your grades say you're fine? Just me?",
    likes: 6,
    samehere: 31,
    comments: 14,
    reposts: 2,
  },
  {
    id: "demo-2",
    name: "Marcus Webb",
    username: "mwebb",
    school: "Georgia Tech",
    avatarSeed: "marcus-samehere",
    minutesAgo: 120,
    content: "Third all-nighter this week. Why does everyone else look like they have it together?",
    likes: 11,
    samehere: 47,
    comments: 22,
    reposts: 0,
  },
  {
    id: "demo-3",
    name: "Jordan Kim",
    username: "jkim",
    school: "UCLA",
    avatarSeed: "jordan-samehere",
    minutesAgo: 1440,
    content: "Shipped my first side project at 2am. No portfolio piece — just something I wanted to exist.",
    likes: 9,
    samehere: 18,
    comments: 5,
    reposts: 3,
  },
];

export const DEMO_VIEWER_PROFILE: DemoProfile = {
  name: "Alex Chen",
  username: "alexc",
  avatarSeed: "alex-samehere",
  school: "UT Austin",
  year: "Junior",
  major: "Computer Science",
  bio: "Trying to balance internships, side projects, and actually sleeping sometimes.",
  goals: "Find students building real things outside class and swap what we're learning.",
  skills: ["TypeScript", "React", "Python", "systems"],
  posts: 42,
  followers: 186,
  following: 94,
};

export const DEMO_PROFILE: DemoProfile = {
  name: "Dev Goswami",
  username: "dev",
  avatarSeed: "dev-goswami",
  school: "",
  year: "",
  major: "",
  role: "Founder",
  showFounderBadge: true,
  showProBadge: true,
  bio: "Building samehere. A place for verified students to show up, share the real stuff, and find people who get it.",
  goals: "Ship a social network students actually want to use — verified, honest, and built around real connection.",
  skills: ["product", "TypeScript", "React", "community"],
  posts: 128,
  followers: 2940,
  following: 311,
};

export const DEMO_SUGGESTIONS: DemoSuggestion[] = [
  {
    name: "Priya Raman",
    username: "priyar",
    avatarSeed: "priya-samehere",
    prompt: "You're both CS juniors at UT Austin — Priya posts about imposter syndrome while applying to internships.",
  },
  {
    name: "Jordan Kim",
    username: "jkim",
    avatarSeed: "jordan-samehere",
    prompt: "You share React and side-project goals — Jordan shipped a late-night build you might relate to.",
  },
];

export const DEMO_COMPOSER_NUDGES = [
  "What's one thing you're learning right now that isn't going on your résumé?",
  "Anyone on your campus dealing with the same midterm crunch? Say what week you're in.",
  "Share a small win from this week — finished an assignment, fixed a bug, made a friend in class.",
];

function hash(seed: string, i: number): number {
  const n = Math.abs(Math.sin(i * 12.9898 + seed.length * 4.1414) * 43758.5453) % 1;
  return n;
}

/** Demo heatmap data shaped like `get_heatmap` RPC output. */
export function buildDemoHeatmap(seed: string, today = new Date()): HeatmapDay[] {
  const days: HeatmapDay[] = [];
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

  for (let i = 371; i >= 0; i--) {
    const cur = new Date(end);
    cur.setUTCDate(end.getUTCDate() - i);
    if (cur > end) continue;

    const day = cur.toISOString().slice(0, 10);
    const roll = hash(seed, i);
    let points = 0;
    const breakdown: Record<string, number> = {};

    if (roll > 0.42) {
      if (roll > 0.82) {
        points = 5;
        breakdown.post = 5;
      } else if (roll > 0.68) {
        points = 3;
        breakdown.comment = 3;
      } else if (roll > 0.55) {
        points = 2;
        breakdown.connection = 2;
      } else {
        points = 1;
        breakdown.profile_update = 1;
      }
    }

    days.push({ day, points, breakdown });
  }

  return days;
}

export function formatTimeAgo(minutesAgo: number): string {
  if (minutesAgo < 60) return `${minutesAgo}m`;
  const h = Math.floor(minutesAgo / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return `${d}d`;
}
