import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCachedLeaderboard, getPeersLeaderboard } from "@/lib/leaderboard";
import AvatarBase from "@/components/ui/Avatar";
import UserBadges from "@/components/profile/UserBadges";
import EmptyState from "@/components/ui/EmptyState";

const pill = "rounded-full px-4 py-1.5 text-sm font-medium transition active:scale-[0.97]";

// Weekly points leaderboard, embedded in the Community shell. Scope switches
// via ?scope= searchParam (server-rendered, no client state) — moved here
// from the orphaned standalone /leaderboard route.
export default async function LeaderboardTab({ scope: rawScope }: { scope?: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null; // proxy already gates this route

  const scope = rawScope === "peers" ? "peers" : "global";

  const rows =
    scope === "peers" ? await getPeersLeaderboard(supabase) : await getCachedLeaderboard(supabase);

  return (
    <div className="mt-5">
      <p className="text-sm text-[var(--ink-muted)]">
        Ranked by points earned this week. Resets every Monday.
      </p>

      <div
        className="mt-4 inline-flex gap-0.5 rounded-full border border-[var(--border)] p-0.5"
        role="tablist"
        aria-label="Leaderboard scope"
      >
        <Link
          href="/community?tab=leaderboard"
          role="tab"
          aria-selected={scope === "global"}
          className={
            scope === "global"
              ? `${pill} bg-[color-mix(in_srgb,var(--blue)_12%,transparent)] text-[var(--blue)]`
              : `${pill} text-[var(--ink-muted)] hover:text-[var(--ink)]`
          }
        >
          Global
        </Link>
        <Link
          href="/community?tab=leaderboard&scope=peers"
          role="tab"
          aria-selected={scope === "peers"}
          className={
            scope === "peers"
              ? `${pill} bg-[color-mix(in_srgb,var(--blue)_12%,transparent)] text-[var(--blue)]`
              : `${pill} text-[var(--ink-muted)] hover:text-[var(--ink)]`
          }
        >
          Peers
        </Link>
      </div>

      <div className="card mt-5">
        {rows.length === 0 ? (
          <EmptyState
            title="No points on the board yet"
            description={
              scope === "peers"
                ? "Follow people who follow you back and your peers show up here."
                : "Be the first this week. Post something and earn your spot."
            }
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
                    <AvatarBase
                      src={row.avatar_url}
                      seed={row.username}
                      name={name}
                      className="h-9 w-9 shrink-0 rounded-full border border-[var(--border)] text-sm"
                      pro={row.is_pro ?? false}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-1.5">
                        <span className="truncate font-medium text-[var(--ink)]">{name}</span>
                        <UserBadges
                          isPro={row.is_pro}
                          isFounder={row.is_founder}
                          isCampusFounder={row.is_campus_founder}
                          isVerifiedStudent={row.verified_student}
                        />
                      </div>
                      <p className="truncate text-xs text-[var(--ink-muted)]">
                        @{row.username}
                        {row.school ? ` · ${row.school}` : ""}
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
    </div>
  );
}
