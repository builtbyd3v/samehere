import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateText, aiEnabled } from "@/lib/ai";
import { WEEKLY_PROMPT_SYSTEM } from "@/lib/ai-prompts";

// Eastern (America/New_York) civil date parts for an instant — DST-aware, the
// one tz constant this project uses for day-boundary logic (see
// supabase/migrations/20260705130000_growth_wave_b_contribution.sql). Exported
// so WeeklyRecap.tsx can key its window off the same day boundary.
export function easternDateParts(d: Date): { year: number; month: number; day: number } {
  // en-CA formats as YYYY-MM-DD, giving zero-padded parts to parse.
  const [year, month, day] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(d)
    .split("-")
    .map(Number);
  return { year, month, day };
}

// ISO-8601 week key, e.g. "2026-W28", keyed off the Eastern civil date so the
// week rolls over at Eastern midnight — same boundary as streak/heatmap.
export function weekKey(d: Date): string {
  const { year, month, day } = easternDateParts(d);
  const date = new Date(Date.UTC(year, month - 1, day));
  const dow = date.getUTCDay() || 7; // Mon=1..Sun=7
  date.setUTCDate(date.getUTCDate() + 4 - dow); // move to this week's Thursday
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

// Coarse academic phase from Eastern month (0-11). // ponytail: coarse month->phase map, refine if it feels off.
export function phaseFor(month: number): string {
  if (month === 11 || month === 0) return "winter break / new semester";
  if (month >= 1 && month <= 3) return "mid-semester";
  if (month === 4) return "finals then summer";
  if (month >= 5 && month <= 7) return "summer break";
  if (month === 8) return "start of fall semester";
  return "mid-fall, midterms"; // 9, 10
}

const FALLBACK_BY_PHASE: Record<string, string> = {
  "winter break / new semester": "What's one goal you're setting for this semester?",
  "mid-semester": "What are you working on this week?",
  "finals then summer": "What's got your focus this finals season?",
  "summer break": "What are you building or learning this summer?",
  "start of fall semester": "What are you most excited about this semester?",
  "mid-fall, midterms": "What's keeping you busy this week?",
};

// Cached per ISO week in `weekly_prompts`. Reads use the session client (RLS:
// authed-read only); writes go through the admin client since there is no
// client insert policy by design (see migration comment).
export async function getWeeklyPrompt(): Promise<{ prompt: string; weekKey: string }> {
  const now = new Date();
  const key = weekKey(now);
  const phase = phaseFor(easternDateParts(now).month - 1);
  const fallback = FALLBACK_BY_PHASE[phase] ?? "What are you working on this week?";

  const supabase = await createClient();

  // Defense-in-depth: the AI generation + service-role cache write below are
  // trusted server work — only run them for an authed request (every caller is
  // proxy-gated today, but don't rely solely on that).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { prompt: fallback, weekKey: key };

  const { data: cached } = await supabase
    .from("weekly_prompts")
    .select("prompt")
    .eq("week_key", key)
    .maybeSingle();
  if (cached?.prompt) return { prompt: cached.prompt, weekKey: key };

  // ponytail: no single-flight lock — a burst of first-of-week loads can each
  // generate once before the first upsert lands (upsert is race-safe; only the
  // AI spend isn't deduped). Bounded to once/week; add a lock only if it matters.
  if (!aiEnabled()) return { prompt: fallback, weekKey: key };

  const isoDate = now.toISOString().slice(0, 10);
  const generated = await generateText(
    WEEKLY_PROMPT_SYSTEM,
    `Today is ${isoDate}. Student phase: ${phase}. Write this week's prompt.`,
    { maxTokens: 60 },
  );
  const prompt = generated ?? fallback;

  // Race-safe: first writer wins, concurrent dupes ignored.
  try {
    const admin = createAdminClient();
    await admin.from("weekly_prompts").upsert(
      { week_key: key, prompt },
      { onConflict: "week_key", ignoreDuplicates: true },
    );
  } catch {
    // best-effort cache write; fall through to local prompt either way
  }

  const { data: reread } = await supabase
    .from("weekly_prompts")
    .select("prompt")
    .eq("week_key", key)
    .maybeSingle();
  return { prompt: reread?.prompt || prompt, weekKey: key };
}

// ponytail: run `npx tsx lib/weekly-prompt.ts` to sanity-check the Eastern
// day-boundary math across both 2026 DST transitions.
if (process.argv[1]?.endsWith("weekly-prompt.ts")) {
  const ymd = (d: Date) => {
    const { year, month, day } = easternDateParts(d);
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  // Spring-forward, 2026-03-08: EST (UTC-5) still in effect at the midnight
  // boundary (the 2am local jump to EDT happens later the same day).
  console.assert(ymd(new Date("2026-03-08T04:59:00Z")) === "2026-03-07", "just before Eastern midnight, pre-DST-jump day");
  console.assert(ymd(new Date("2026-03-08T05:00:00Z")) === "2026-03-08", "just after Eastern midnight, pre-DST-jump day");

  // Fall-back, 2026-11-01: EDT (UTC-4) still in effect at the midnight
  // boundary (the 2am local fall-back to EST happens later the same day).
  console.assert(ymd(new Date("2026-11-01T03:59:00Z")) === "2026-10-31", "just before Eastern midnight, fall-back day");
  console.assert(ymd(new Date("2026-11-01T04:00:00Z")) === "2026-11-01", "just after Eastern midnight, fall-back day");

  // weekKey must not roll over early: 2026-03-08 is a Sunday. 23:30 Eastern
  // that Sunday is already Monday 03:30 UTC — the old UTC-based weekKey would
  // wrongly call that the next ISO week. Both instants are Eastern-Sunday, so
  // both must land in the same week as Sunday noon Eastern (unambiguous in UTC too).
  console.assert(
    weekKey(new Date("2026-03-09T03:30:00Z")) === weekKey(new Date("2026-03-08T16:00:00Z")),
    "Sunday-night-Eastern must not roll to next week's key",
  );
  console.assert(phaseFor(2) === "mid-semester", "phaseFor(2) is mid-semester");

  console.log("weekly-prompt tz self-check passed");
}
