import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCachedLeaderboard } from "@/lib/leaderboard";
import AvatarImage from "@/components/ui/AvatarImage";
import UserBadges from "@/components/profile/UserBadges";
import EmptyState from "@/components/ui/EmptyState";

const pill = "rounded-full px-4 py-1.5 text-sm font-medium transition active:scale-[0.97]";

// Weekly points leaderboard. Scope switches via ?scope= searchParam (server-rendered,
// no client state) — same pattern as FeedTabs. Global always shows; "Your school"
// only appears once the viewer has a school on file.
export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null; // proxy already gates this route

  const { data: viewerSchoolRow } = await supabase
    .from("profile_school")
    .select("school")
    .eq("profile_id", user.id)
    .maybeSingle();
  const viewerSchool = viewerSchoolRow?.school ?? null;

  const scope = params.scope === "school" && viewerSchool ? "school" : "global";

  const rows = await getCachedLeaderboard(supabase, scope, viewerSchool);

  return (
    <main className="page-enter mx-auto max-w-2xl px-4 py-6 sm:px-5 sm:py-8">
      <h1 className="text-xl font-semibold tracking-[-0.02em] sm:text-2xl">Leaderboard</h1>
      <p className="mt-1 text-sm text-[var(--ink-muted)]">
        Ranked by points earned this week. Resets every Monday.
      </p>

      {viewerSchool && (
        <div
          className="mt-4 inline-flex gap-0.5 rounded-full border border-[var(--border)] p-0.5"
          role="tablist"
          aria-label="Leaderboard scope"
        >
          <Link
            href="/leaderboard"
            role="tab"
            aria-selected={scope === "global"}
            className={
              scope === "global"
                ? `${pill} bg-[var(--featured-surface)] text-[var(--ink)]`
                : `${pill} text-[var(--ink-muted)] hover:text-[var(--ink)]`
            }
          >
            Global
          </Link>
          <Link
            href="/leaderboard?scope=school"
            role="tab"
            aria-selected={scope === "school"}
            className={
              scope === "school"
                ? `${pill} bg-[var(--featured-surface)] text-[var(--ink)]`
                : `${pill} text-[var(--ink-muted)] hover:text-[var(--ink)]`
            }
          >
            Your school
          </Link>
        </div>
      )}

      <div className="card mt-5">
        {rows.length === 0 ? (
          <EmptyState
            title="No points on the board yet"
            description="Be the first this week. Post something and earn your spot."
            action={{ label: "Go post", href: "/feed" }}
          />
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {rows.map((row) => {
              const name = row.display_name ?? row.username;
              const isViewer = row.id === user.id;
              const top3 = row.rank <= 3;
              return (
                <li key={row.id} className={isViewer ? "bg-[var(--featured-surface)]/60" : ""}>
                  <Link
                    href={`/profile/${row.username}`}
                    className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-[var(--featured-surface)]"
                  >
                    <span
                      className={`w-6 shrink-0 text-center tabular-nums ${
                        top3 ? "text-base font-semibold text-[var(--ink)]" : "text-sm text-[var(--ink-muted)]"
                      }`}
                    >
                      {row.rank}
                    </span>
                    {row.avatar_url ? (
                      <AvatarImage
                        src={row.avatar_url}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-full border border-[var(--border)] object-cover"
                      />
                    ) : (
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-sm font-semibold text-[var(--ink-muted)]">
                        {name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-1.5">
                        <span className="truncate font-medium text-[var(--ink)]">{name}</span>
                        <UserBadges isPro={row.is_pro} isFounder={row.is_founder} isCampusFounder={row.is_campus_founder} />
                      </div>
                      <p className="truncate text-xs text-[var(--ink-muted)]">
                        @{row.username}
                        {scope === "global" && row.school ? ` · ${row.school}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-[var(--ink)]">
                      {row.weekly_points} pts
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
