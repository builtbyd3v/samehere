import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateText, aiEnabled } from "@/lib/ai";
import { WEEKLY_PROMPT_SYSTEM } from "@/lib/ai-prompts";

// ISO-8601 week key, e.g. "2026-W28". UTC so it's stable regardless of server tz.
export function weekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7; // Mon=1..Sun=7
  date.setUTCDate(date.getUTCDate() + 4 - day); // move to this week's Thursday
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

// Coarse academic phase from UTC month (0-11). // ponytail: coarse month->phase map, refine if it feels off.
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
export async function getWeeklyPrompt(): Promise<string> {
  const now = new Date();
  const key = weekKey(now);
  const phase = phaseFor(now.getUTCMonth());
  const fallback = FALLBACK_BY_PHASE[phase] ?? "What are you working on this week?";

  const supabase = await createClient();
  const { data: cached } = await supabase
    .from("weekly_prompts")
    .select("prompt")
    .eq("week_key", key)
    .maybeSingle();
  if (cached?.prompt) return cached.prompt;

  if (!aiEnabled()) return fallback;

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
  return reread?.prompt || prompt;
}
