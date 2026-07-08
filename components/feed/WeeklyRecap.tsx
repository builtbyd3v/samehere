import { createClient } from "@/lib/supabase/server";

// ponytail: 7-day window computed from UTC "now" — coarse, not tz-exact vs the
// Eastern day-boundary the streak/heatmap use. Fine for a rough weekly nudge.
function sevenDaysAgoUTC(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 7);
  return d.toISOString().slice(0, 10);
}

function pluralize(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

export default async function WeeklyRecap({ userId }: { userId: string }) {
  const supabase = await createClient();

  const [logRes, streakRes] = await Promise.all([
    supabase.from("contribution_log").select("action_type").eq("user_id", userId).gte("date", sevenDaysAgoUTC()),
    supabase.rpc("get_streak", { p_profile_id: userId }),
  ]);

  const rows = logRes.data ?? [];
  const posts = rows.filter((r) => r.action_type === "post").length;
  const comments = rows.filter((r) => r.action_type === "comment").length;
  const connections = rows.filter((r) => r.action_type === "connection").length;

  const streak = streakRes.error ? null : (streakRes.data?.[0] ?? null);
  const currentStreak = streak?.current_streak ?? 0;

  if (posts === 0 && comments === 0 && connections === 0 && currentStreak === 0) return null;

  // Streak is rendered separately in blue (the samehere accent); the rest are
  // plain activity stats.
  const stats: string[] = [];
  if (posts > 0) stats.push(pluralize(posts, "post"));
  if (comments > 0) stats.push(pluralize(comments, "comment"));
  if (connections > 0) stats.push(`${connections} new connection${connections === 1 ? "" : "s"}`);

  return (
    <section className="card mb-3 p-4">
      <p className="text-sm text-[var(--ink-muted)]">
        <span className="font-semibold text-[var(--ink)]">Your week</span>
        {stats.length > 0 && <> · {stats.join(" · ")}</>}
        {currentStreak > 0 && (
          <> · <span className="font-semibold text-[var(--blue)]">{currentStreak}-day streak</span></>
        )}
      </p>
    </section>
  );
}
