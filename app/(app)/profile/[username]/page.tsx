import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FollowButton, { type FollowState } from "@/components/profile/FollowButton";

const YEAR_LABEL: Record<string, string> = {
  freshman: "Freshman",
  sophomore: "Sophomore",
  junior: "Junior",
  senior: "Senior",
  grad: "Grad student",
};

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  // Wave 1: viewer identity and the profile are independent — fetch together.
  const [{ data: { user } }, { data: profile }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, year, major, bio, goals, skills, is_private, heatmap_visibility")
      .eq("username", username)
      .maybeSingle(),
  ]);

  if (!profile) notFound();

  const isOwner = user?.id === profile.id;

  // Wave 2: school, counts, and the follow relationship all key off profile.id
  // and don't depend on each other — run them in parallel.
  //   - school: profile_school RLS returns the row only when visible (null == hidden)
  //   - counts: definer function, so the follow graph itself stays private
  //   - rel: drives private-account gating
  const [schoolRes, countRes, relRes] = await Promise.all([
    supabase.from("profile_school").select("school").eq("profile_id", profile.id).maybeSingle(),
    supabase.rpc("get_profile_counts", { p_profile_id: profile.id }),
    user && !isOwner
      ? supabase
          .from("follows")
          .select("status")
          .eq("follower_id", user.id)
          .eq("following_id", profile.id)
          .maybeSingle()
      : Promise.resolve({ data: null as { status: string } | null }),
  ]);

  const school = schoolRes.data?.school ?? null;
  const counts = countRes.data?.[0] ?? { posts: 0, followers: 0, following: 0 };
  const isAcceptedFollower = relRes.data?.status === "accepted";

  const followState: FollowState =
    relRes.data?.status === "accepted" ? "following" : relRes.data?.status === "pending" ? "pending" : "none";

  const contentHidden = profile.is_private && !isOwner && !isAcceptedFollower;
  const canSeeHeatmap =
    isOwner || isAcceptedFollower || profile.heatmap_visibility === "public";

  const meta = [school, profile.year ? YEAR_LABEL[profile.year] : null, profile.major]
    .filter(Boolean)
    .join(" · ");

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      {/* Header */}
      <header className="flex items-start gap-5">
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt=""
            className="h-20 w-20 shrink-0 rounded-full border border-[var(--border)] object-cover"
          />
        ) : (
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-2xl font-semibold text-[var(--ink-muted)]">
            {(profile.display_name ?? profile.username).charAt(0).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold tracking-[-0.02em]">
                {profile.display_name ?? profile.username}
              </h1>
              <p className="text-[15px] text-[var(--ink-muted)]">@{profile.username}</p>
            </div>

            {isOwner ? (
              <Link
                href="/profile/edit"
                className="shrink-0 rounded-md border border-[var(--border-strong)] px-3 py-1.5 text-sm font-medium transition active:opacity-80"
              >
                Edit profile
              </Link>
            ) : user ? (
              <FollowButton targetId={profile.id} initial={followState} />
            ) : null}
          </div>

          {meta && <p className="mt-1.5 text-sm text-[var(--ink-muted)]">{meta}</p>}

          {/* Counts */}
          <div className="mt-4 flex gap-6 text-sm">
            <span>
              <b className="font-semibold">{Number(counts.posts)}</b>{" "}
              <span className="text-[var(--ink-muted)]">posts</span>
            </span>
            <span>
              <b className="font-semibold">{Number(counts.followers)}</b>{" "}
              <span className="text-[var(--ink-muted)]">followers</span>
            </span>
            <span>
              <b className="font-semibold">{Number(counts.following)}</b>{" "}
              <span className="text-[var(--ink-muted)]">following</span>
            </span>
          </div>
        </div>
      </header>

      {/* Bio + goals */}
      {profile.bio && (
        <p className="mt-6 whitespace-pre-line text-[15px] leading-relaxed">{profile.bio}</p>
      )}
      {profile.goals && (
        <div className="mt-5">
          <h2 className="text-xs font-medium uppercase tracking-wide text-[var(--ink-muted)]">
            Goals
          </h2>
          <p className="mt-1.5 whitespace-pre-line text-[15px] leading-relaxed">{profile.goals}</p>
        </div>
      )}

      {/* Skills */}
      {profile.skills && profile.skills.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {profile.skills.map((s) => (
            <span
              key={s}
              className="rounded-full border border-[var(--border)] px-3 py-1 text-sm text-[var(--ink-muted)]"
            >
              {s}
            </span>
          ))}
        </div>
      )}

      {/* Heatmap slot (Phase 8) */}
      {canSeeHeatmap && (
        <section className="mt-8 rounded-xl border border-[var(--border)] p-6">
          <h2 className="text-sm font-medium">Contribution heatmap</h2>
          {/* TODO(Phase 8): render <ContributionHeatmap> via get_heatmap(profile.id) */}
          <p className="mt-2 text-sm text-[var(--ink-muted)]">Coming in this build.</p>
        </section>
      )}

      {/* Content: posts, or private notice */}
      <section className="mt-8 border-t border-[var(--border)] pt-6">
        {contentHidden ? (
          <div className="rounded-xl border border-[var(--border)] p-8 text-center">
            <p className="font-medium">This account is private</p>
            <p className="mt-1.5 text-sm text-[var(--ink-muted)]">
              Follow @{profile.username} to see their posts.
            </p>
          </div>
        ) : (
          // TODO(Phase 5): list this profile's posts
          <p className="text-sm text-[var(--ink-muted)]">Posts coming in this build.</p>
        )}
      </section>
    </main>
  );
}
