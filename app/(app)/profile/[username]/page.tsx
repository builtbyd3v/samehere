import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { FollowState } from "@/components/profile/FollowButton";
import ProfileActions from "@/components/profile/ProfileActions";
import BlockButton from "@/components/profile/BlockButton";
import PostCard, { POST_SELECT, type FeedPost } from "@/components/feed/PostCard";
import FeedTimeline from "@/components/feed/FeedTimeline";
import ContributionHeatmap, { type HeatmapDay } from "@/components/profile/ContributionHeatmap";
import { attachSignedMedia } from "@/lib/media";
import { fetchQuotedReposts } from "@/lib/feed-quotes";
import { mergeFeedTimeline } from "@/lib/feed-timeline";
import UserBadges from "@/components/profile/UserBadges";
import AvatarImage from "@/components/ui/AvatarImage";

const YEAR_LABEL: Record<string, string> = {
  freshman: "Freshman",
  sophomore: "Sophomore",
  junior: "Junior",
  senior: "Senior",
  grad: "Grad student",
};

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <span className="text-sm">
      <b className="font-semibold text-[var(--ink)]">{value.toLocaleString()}</b>{" "}
      <span className="text-[var(--ink-muted)]">{label}</span>
    </span>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, bio, avatar_url")
    .eq("username", username)
    .maybeSingle();

  if (!profile) return { title: "Profile not found" };

  const name = profile.display_name ?? username;
  const description = profile.bio?.slice(0, 160) ?? `${name} (@${username}) on samehere`;

  return {
    title: `${name} (@${username})`,
    description,
    openGraph: {
      title: `${name} on samehere`,
      description,
      type: "profile",
      ...(profile.avatar_url ? { images: [{ url: profile.avatar_url, alt: name }] } : {}),
    },
    twitter: {
      card: "summary",
      title: `${name} on samehere`,
      description,
      ...(profile.avatar_url ? { images: [profile.avatar_url] } : {}),
    },
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  const [{ data: { user } }, { data: profile }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, year, major, bio, goals, skills, is_private, heatmap_visibility, is_pro, is_founder")
      .eq("username", username)
      .maybeSingle(),
  ]);

  if (!profile) notFound();

  const isOwner = user?.id === profile.id;
  const displayName = profile.display_name ?? profile.username;

  const [schoolRes, countRes, relRes, postsRes, quotesRes, heatRes, blockedIdsRes, myBlockRes] = await Promise.all([
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
    supabase
      .from("posts")
      .select(POST_SELECT)
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .returns<FeedPost[]>(),
    fetchQuotedReposts(supabase, { userIds: [profile.id], limit: 20 }),
    supabase.rpc("get_heatmap", { p_profile_id: profile.id }),
    user && !isOwner ? supabase.rpc("get_blocked_ids") : Promise.resolve({ data: [] as string[] }),
    user && !isOwner
      ? supabase.from("blocks").select("id").eq("blocker_id", user.id).eq("blocked_id", profile.id).maybeSingle()
      : Promise.resolve({ data: null as { id: string } | null }),
  ]);

  const viewerId = user?.id ?? null;
  const school = schoolRes.data?.school ?? null;
  const counts = countRes.data?.[0] ?? { posts: 0, followers: 0, following: 0 };
  const isAcceptedFollower = relRes.data?.status === "accepted";
  const posts = await attachSignedMedia(supabase, postsRes.data ?? []);
  const heatmap = (heatRes.data ?? []) as HeatmapDay[];
  const isBlocked = !!(blockedIdsRes.data ?? []).includes(profile.id);
  const amIBlocking = !!myBlockRes.data;

  const followState: FollowState =
    relRes.data?.status === "accepted" ? "following" : relRes.data?.status === "pending" ? "pending" : "none";

  const contentHidden = (profile.is_private && !isOwner && !isAcceptedFollower) || isBlocked;
  const timeline = contentHidden ? [] : mergeFeedTimeline(posts, quotesRes).slice(0, 20);
  const canSeeHeatmap = isOwner || isAcceptedFollower || profile.heatmap_visibility === "public";

  const metaParts = [
    school,
    profile.year ? YEAR_LABEL[profile.year] : null,
    profile.major,
  ].filter(Boolean);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-5 sm:py-8">
      {/* Identity */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          {profile.avatar_url ? (
            <AvatarImage
              src={profile.avatar_url}
              alt=""
              className="h-20 w-20 shrink-0 rounded-full border border-[var(--border)] object-cover sm:h-24 sm:w-24"
            />
          ) : (
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--featured-surface)] text-2xl font-semibold text-[var(--ink-muted)] sm:h-24 sm:w-24">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                  <h1 className="text-xl font-semibold tracking-[-0.02em] sm:text-2xl">{displayName}</h1>
                  <UserBadges isPro={profile.is_pro} isFounder={profile.is_founder} />
                </div>
                <p className="mt-0.5 text-[15px] text-[var(--ink-muted)]">@{profile.username}</p>
              </div>

              {isOwner && (
                <Link
                  href="/profile/edit"
                  className="shrink-0 rounded-full border border-[var(--border-strong)] px-4 py-1.5 text-sm font-medium transition hover:bg-[var(--featured-surface)] active:opacity-80"
                >
                  Edit profile
                </Link>
              )}
            </div>

            {metaParts.length > 0 && (
              <p className="mt-2 text-sm text-[var(--ink-muted)]">{metaParts.join(" · ")}</p>
            )}

            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1">
              <Stat value={Number(counts.posts)} label="posts" />
              <Stat value={Number(counts.followers)} label="followers" />
              <Stat value={Number(counts.following)} label="following" />
            </div>

            {!isOwner && user && (
              <div className="mt-5 border-t border-[var(--border)] pt-5">
                <ProfileActions
                  username={profile.username}
                  targetId={profile.id}
                  followState={followState}
                  blocked={isBlocked}
                  amIBlocking={amIBlocking}
                />
              </div>
            )}
          </div>
        </div>

        {profile.bio && (
          <p className="mt-5 max-w-[65ch] whitespace-pre-line break-words text-[16px] leading-[1.55] text-[var(--ink)]">
            {profile.bio}
          </p>
        )}

        {profile.goals && (
          <div className="mt-5 border-t border-[var(--border)] pt-5">
            <p className="text-sm font-semibold text-[var(--ink)]">Goals</p>
            <p className="mt-1.5 max-w-[65ch] whitespace-pre-line break-words text-[15px] leading-[1.55] text-[var(--ink-muted)]">
              {profile.goals}
            </p>
          </div>
        )}

        {profile.skills && profile.skills.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--border)] pt-5">
            {profile.skills.map((s) => (
              <span
                key={s}
                className="rounded-full border border-[var(--border)] bg-[var(--canvas)] px-3 py-1 text-sm text-[var(--ink-muted)]"
              >
                {s}
              </span>
            ))}
          </div>
        )}

        {!isOwner && user && (!isBlocked || amIBlocking) && (
          <div className="mt-5 flex justify-end border-t border-[var(--border)] pt-4">
            <BlockButton targetId={profile.id} initialBlocked={amIBlocking} />
          </div>
        )}
      </section>

      {canSeeHeatmap && (
        <section className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-5 sm:p-6">
          <h2 className="mb-4 text-sm font-semibold text-[var(--ink)]">Activity</h2>
          <ContributionHeatmap data={heatmap} />
        </section>
      )}

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-[var(--ink)]">Posts</h2>

        {isBlocked ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] px-6 py-12 text-center">
            <p className="font-medium text-[var(--ink)]">Posts unavailable</p>
            <p className="mt-1.5 text-sm text-[var(--ink-muted)]">
              You and @{profile.username} cannot see each other&apos;s posts.
            </p>
          </div>
        ) : contentHidden ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] px-6 py-12 text-center">
            <p className="font-medium text-[var(--ink)]">This account is private</p>
            <p className="mt-1.5 text-sm text-[var(--ink-muted)]">
              Follow @{profile.username} to see their posts.
            </p>
          </div>
        ) : timeline.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] px-6 py-12 text-center">
            <p className="text-sm text-[var(--ink-muted)]">
              {isOwner ? "You have not posted yet." : `@${profile.username} has not posted yet.`}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <FeedTimeline items={timeline} viewerId={viewerId} />
          </div>
        )}
      </section>
    </main>
  );
}
