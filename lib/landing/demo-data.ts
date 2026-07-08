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
  showCampusFounderBadge?: boolean;
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
    content: "Shipped my first side project at 2am. No portfolio piece, just something I wanted to exist.",
    likes: 9,
    samehere: 18,
    comments: 5,
    reposts: 3,
  },
];

/** Lightweight peers for the hero cluster — real-feeling, vulnerable, and
 *  aimed squarely at the target segments (commuter / online / transfer /
 *  first-gen). Each reads as one reachable student. `pos` places the card in the
 *  drifting scatter; `mobile: false` hides the outermost cards on small screens. */
export type HeroPeer = {
  name: string;
  username: string;
  school: string;
  avatarSeed: string;
  line: string;
  same: number;
  pos: { x: number; y: number; scale: number; op: number; z: number };
  float: { fx: string; fy: string; fr: string; dur: number; delay: number };
  mobile: boolean;
};

export const HERO_PEERS: HeroPeer[] = [
  { name: "Priya Raman", username: "priyar", school: "UT Austin", avatarSeed: "priya-samehere",
    line: "Feel behind in CS even when your grades say you're fine?", same: 31,
    pos: { x: 16, y: 20, scale: 1.0, op: 1, z: 30 }, float: { fx: "8px", fy: "-12px", fr: "-1.5deg", dur: 9, delay: 0 }, mobile: true },
  { name: "Marcus Webb", username: "mwebb", school: "Georgia Tech", avatarSeed: "marcus-samehere",
    line: "Third all-nighter this week. Everyone else looks like they have it together.", same: 47,
    pos: { x: 50, y: 11, scale: 1.06, op: 1, z: 40 }, float: { fx: "-6px", fy: "-14px", fr: "1.2deg", dur: 11, delay: 0.6 }, mobile: true },
  { name: "Sofia Delgado", username: "sofiad", school: "Miami Dade (transfer)", avatarSeed: "sofia-samehere",
    line: "Transferred in and I don't know a single person here yet.", same: 52,
    pos: { x: 83, y: 19, scale: 0.94, op: 0.95, z: 28 }, float: { fx: "-9px", fy: "-10px", fr: "-1deg", dur: 10, delay: 1.1 }, mobile: false },
  { name: "Devon Clarke", username: "devonc", school: "First-gen · Rutgers", avatarSeed: "devon-samehere",
    line: "First in my family to go. Figuring it all out live.", same: 61,
    pos: { x: 31, y: 43, scale: 1.02, op: 1, z: 36 }, float: { fx: "10px", fy: "-9px", fr: "1.5deg", dur: 8.5, delay: 0.3 }, mobile: true },
  { name: "Aisha Nour", username: "aishan", school: "Commuter · CSULB", avatarSeed: "aisha-samehere",
    line: "2-hour commute each way. Hard to feel part of campus.", same: 44,
    pos: { x: 69, y: 41, scale: 1.0, op: 1, z: 35 }, float: { fx: "-8px", fy: "-12px", fr: "-1.2deg", dur: 9.5, delay: 0.9 }, mobile: true },
  { name: "Lena Park", username: "lenap", school: "ASU Online", avatarSeed: "lena-samehere",
    line: "Fully online. Some days I forget I'm even in college.", same: 39,
    pos: { x: 9, y: 60, scale: 0.9, op: 0.85, z: 20 }, float: { fx: "7px", fy: "-11px", fr: "1deg", dur: 12, delay: 1.4 }, mobile: false },
  { name: "Omar Haddad", username: "omarh", school: "De Anza (transfer)", avatarSeed: "omar-samehere",
    line: "Anyone else eat lunch alone between classes?", same: 57,
    pos: { x: 51, y: 71, scale: 0.98, op: 0.98, z: 30 }, float: { fx: "-7px", fy: "-13px", fr: "-1.4deg", dur: 10.5, delay: 0.5 }, mobile: true },
  { name: "Tyler Brooks", username: "tylerb", school: "Ohio State", avatarSeed: "tyler-samehere",
    line: "Everyone's got internships lined up. I've got imposter syndrome.", same: 28,
    pos: { x: 85, y: 58, scale: 0.85, op: 0.8, z: 16 }, float: { fx: "-6px", fy: "-9px", fr: "1.3deg", dur: 11.5, delay: 1.7 }, mobile: false },
  { name: "Nina Alvarez", username: "ninaa", school: "Arizona State", avatarSeed: "nina-samehere",
    line: "Small wins count too, right? Posting mine so I remember them.", same: 15,
    pos: { x: 26, y: 80, scale: 0.9, op: 0.86, z: 22 }, float: { fx: "9px", fy: "-10px", fr: "-1deg", dur: 9, delay: 2.0 }, mobile: false },
  { name: "Jordan Kim", username: "jkim", school: "UCLA", avatarSeed: "jordan-samehere",
    line: "Shipped my first side project at 2am. Just wanted it to exist.", same: 18,
    pos: { x: 78, y: 78, scale: 0.9, op: 0.86, z: 24 }, float: { fx: "-8px", fy: "-11px", fr: "1.2deg", dur: 10, delay: 1.2 }, mobile: true },
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
  name: "Maya Ortiz",
  username: "mortiz",
  avatarSeed: "maya-samehere",
  school: "Arizona State",
  year: "Sophomore",
  major: "Biology",
  bio: "Pre-med, mostly stressed, occasionally normal. Posting the small wins so future me remembers they happened.",
  goals: "Find other people grinding through orgo who don't have it all figured out either.",
  skills: ["Python", "research", "public speaking", "time management"],
  posts: 9,
  followers: 47,
  following: 63,
};

export const DEMO_SUGGESTIONS: DemoSuggestion[] = [
  {
    name: "Priya Raman",
    username: "priyar",
    avatarSeed: "priya-samehere",
    prompt: "You're both CS juniors at UT Austin. Priya posts about imposter syndrome while applying to internships.",
  },
  {
    name: "Jordan Kim",
    username: "jkim",
    avatarSeed: "jordan-samehere",
    prompt: "You share React and side-project goals. Jordan shipped a late-night build you might relate to.",
  },
];

export const DEMO_COMPOSER_NUDGES = [
  "What's one thing you're learning right now that isn't going on your résumé?",
  "Anyone on your campus dealing with the same midterm crunch? Say what week you're in.",
  "Share a small win from this week: finished an assignment, fixed a bug, made a friend in class.",
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
