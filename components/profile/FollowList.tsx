import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AvatarBase from "@/components/ui/Avatar";
import UserBadges from "@/components/profile/UserBadges";
import FollowButton, { type FollowState } from "@/components/profile/FollowButton";

type FollowRow = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_pro: boolean;
  is_founder: boolean;
  is_campus_founder: boolean;
  verified_student: boolean;
  year: string | null;
  major: string | null;
  viewer_follow_status: "accepted" | "pending" | null;
  followed_at: string;
};

// get_follow_list isn't in the generated Database types yet — cast once here,
// same pattern as callRpc in app/(app)/profile/[username]/page.tsx.
async function getFollowList(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string,
  kind: "followers" | "following",
): Promise<FollowRow[]> {
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: FollowRow[] | null }>;
  const { data } = await rpc("get_follow_list", { p_profile_id: profileId, p_kind: kind });
  return data ?? [];
}

function toFollowState(status: "accepted" | "pending" | null): FollowState {
  return status === "accepted" ? "following" : status === "pending" ? "pending" : "none";
}

export default async function FollowList({
  username,
  kind,
}: {
  username: string;
  kind: "followers" | "following";
}) {
  const supabase = await createClient();

  const [{ data: { user } }, { data: target }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("profiles").select("id, username, display_name, is_private").eq("username", username).maybeSingle(),
  ]);

  if (!target) notFound();

  const rows = await getFollowList(supabase, target.id, kind);
  const displayName = target.display_name ?? target.username;
  const tabBase = `/profile/${target.username}`;

  const pill =
    "rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-200 active:scale-[0.97]";

  return (
    <main className="page-enter mx-auto max-w-2xl px-4 py-6 sm:px-5 sm:py-8">
      <header>
        <Link href={tabBase} className="text-sm text-[var(--ink-muted)] hover:underline">
          &larr; {displayName} (@{target.username})
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.025em]">{displayName}</h1>
      </header>

      <div
        className="mt-4 inline-flex gap-0.5 rounded-full border border-[var(--border)] p-0.5"
        role="tablist"
        aria-label="Follow list"
      >
        <Link
          href={`${tabBase}/followers`}
          role="tab"
          aria-selected={kind === "followers"}
          className={
            kind === "followers"
              ? `${pill} bg-[var(--blue-glow)] text-[var(--blue)]`
              : `${pill} text-[var(--ink-muted)] hover:text-[var(--ink)]`
          }
        >
          Followers
        </Link>
        <Link
          href={`${tabBase}/following`}
          role="tab"
          aria-selected={kind === "following"}
          className={
            kind === "following"
              ? `${pill} bg-[var(--blue-glow)] text-[var(--blue)]`
              : `${pill} text-[var(--ink-muted)] hover:text-[var(--ink)]`
          }
        >
          Following
        </Link>
      </div>

      <div className="card mt-3 divide-y divide-[var(--border)]">
        {rows.length === 0 ? (
          target.is_private && user?.id !== target.id ? (
            <p className="px-6 py-12 text-center font-medium text-[var(--ink)]">
              This account is private. Follow them to see this.
            </p>
          ) : (
            <p className="px-6 py-12 text-center text-sm text-[var(--ink-muted)]">
              {kind === "followers" ? "No followers yet." : "Not following anyone yet."}
            </p>
          )
        ) : (
          rows.map((row, i) => {
            const rowName = row.display_name ?? row.username;
            const line = row.year && row.major ? `${row.year} · ${row.major}` : row.year ?? row.major;
            return (
              <div
                key={row.id}
                className="cascade-up flex items-center gap-3 px-5 py-3"
                style={{ "--delay": `${i * 40}ms` } as React.CSSProperties}
              >
                <AvatarBase
                  src={row.avatar_url}
                  seed={row.username}
                  name={rowName}
                  pro={row.is_pro}
                  className="h-11 w-11 shrink-0 rounded-full border border-[var(--border)] text-sm"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-1.5">
                    <Link href={`/profile/${row.username}`} className="truncate font-medium hover:underline">
                      {rowName}
                    </Link>
                    <UserBadges
                      isPro={row.is_pro}
                      isFounder={row.is_founder}
                      isCampusFounder={row.is_campus_founder}
                      isVerifiedStudent={row.verified_student}
                    />
                  </div>
                  <p className="truncate text-sm text-[var(--ink-muted)]">@{row.username}</p>
                  {line && <p className="truncate text-xs text-[var(--ink-muted)]">{line}</p>}
                </div>
                {user && row.id !== user.id && (
                  <FollowButton targetId={row.id} initial={toFollowState(row.viewer_follow_status)} />
                )}
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
