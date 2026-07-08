import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { FollowState } from "@/components/profile/FollowButton";
import ProfileActions from "@/components/profile/ProfileActions";
import BlockButton from "@/components/profile/BlockButton";
import PostCard, { POST_SELECT, type FeedPost } from "@/components/feed/PostCard";
import FeedTimeline from "@/components/feed/FeedTimeline";
import ContributionHeatmap, { type HeatmapDay } from "@/components/profile/ContributionHeatmap";
import ProfileViewers, { type ProfileViewer } from "@/components/profile/ProfileViewers";
import { attachSignedMedia } from "@/lib/media";
import { fetchQuotedReposts } from "@/lib/feed-quotes";
import { fetchPlainReposts } from "@/lib/feed-reposts";
import { mergeFeedTimeline } from "@/lib/feed-timeline";
import UserBadges from "@/components/profile/UserBadges";
import AvatarImage from "@/components/ui/AvatarImage";
import { isPro } from "@/lib/pro";
import type { MatchSignal } from "@/lib/match";
import { cachedConnectionPrompts, connectionPrompt } from "@/lib/connection-prompt";

const YEAR_LABEL: Record<string, string> = {
  freshman: "Freshman",
  sophomore: "Sophomore",
  junior: "Junior",
  senior: "Senior",
  grad: "Grad student",
};

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <span className="text-[15px]">
      <b className="font-semibold tracking-[-0.01em] text-[var(--ink)]">{value.toLocaleString()}</b>{" "}
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
      .select(
        "id, username, display_name, avatar_url, banner_url, year, major, bio, goals, skills, courses, is_private, heatmap_visibility, is_pro, is_founder, is_campus_founder, accent_color"
      )
      .eq("username", username)
      .maybeSingle(),
  ]);

  if (!profile) notFound();

  const isOwner = user?.id === profile.id;
  const displayName = profile.display_name ?? profile.username;

  // Record the view fire-and-forget (after the response is sent) — never on own
  // profile. record_profile_view also self-guards server-side; this just skips
  // the call entirely for the owner.
  if (user && !isOwner) {
    after(async () => {
      await supabase.rpc("record_profile_view", { p_viewed: profile.id });
    });
  }

  const [schoolRes, countRes, relRes, postsRes, quotesRes, repostsRes, heatRes, streakRes, blockedIdsRes, myBlockRes, viewsRes, viewerSignalRes] = await Promise.all([
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
    fetchPlainReposts(supabase, { userIds: [profile.id], limit: 20 }),
    supabase.rpc("get_heatmap", { p_profile_id: profile.id }),
    // get_heatmap-style call — enforces heatmap_visibility server-side itself;
    // an error here (hidden case) just means no streak is rendered.
    supabase.rpc("get_streak", { p_profile_id: profile.id }),
    user && !isOwner ? supabase.rpc("get_blocked_ids") : Promise.resolve({ data: [] as string[] }),
    user && !isOwner
      ? supabase.from("blocks").select("id").eq("blocker_id", user.id).eq("blocked_id", profile.id).maybeSingle()
      : Promise.resolve({ data: null as { id: string } | null }),
    // Owner-only RPC — returns empty for everyone else, so only bother calling it for the owner.
    isOwner ? supabase.rpc("get_profile_views", { p_profile: profile.id }) : Promise.resolve({ data: [] as ProfileViewer[] }),
    // Viewer's own match signal — only needed to build the "why you two match" line below.
    user && !isOwner
      ? supabase
          .from("profiles")
          .select("year, major, skills, goals, bio, courses, is_pro, profile_school(school)")
          .eq("id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null as { year: string | null; major: string | null; skills: string[] | null; goals: string | null; bio: string | null; courses: string[] | null; is_pro: boolean; profile_school: { school: string | null } | null } | null }),
  ]);

  const viewerId = user?.id ?? null;
  const school = schoolRes.data?.school ?? null;
  const counts = countRes.data?.[0] ?? { posts: 0, followers: 0, following: 0 };
  const isAcceptedFollower = relRes.data?.status === "accepted";
  const posts = await attachSignedMedia(supabase, postsRes.data ?? []);
  const heatmap = (heatRes.data ?? []) as HeatmapDay[];
  const streak = streakRes.error ? null : (streakRes.data?.[0] ?? null);
  const isBlocked = !!(blockedIdsRes.data ?? []).includes(profile.id);
  const amIBlocking = !!myBlockRes.data;
  const profileIsPro = isPro(profile);
  const profileViews = (viewsRes.data ?? []) as ProfileViewer[];

  const followState: FollowState =
    relRes.data?.status === "accepted" ? "following" : relRes.data?.status === "pending" ? "pending" : "none";

  const contentHidden = (profile.is_private && !isOwner && !isAcceptedFollower) || isBlocked;
  const timeline = contentHidden ? [] : mergeFeedTimeline(posts, quotesRes, repostsRes).slice(0, 20);
  const canSeeHeatmap = isOwner || isAcceptedFollower || profile.heatmap_visibility === "public";

  // "Why you two match" — only where post content would be visible to this viewer
  // (mirrors contentHidden: excludes private-non-follower and blocked). Reuses the
  // same connection-prompt infra as the feed's suggested-follow cards.
  let matchPrompt: string | null = null;
  if (user && !isOwner && !contentHidden) {
    const viewerSignal: MatchSignal = {
      year: viewerSignalRes.data?.year ?? null,
      major: viewerSignalRes.data?.major ?? null,
      skills: viewerSignalRes.data?.skills ?? null,
      goals: viewerSignalRes.data?.goals ?? null,
      bio: viewerSignalRes.data?.bio ?? null,
      school: viewerSignalRes.data?.profile_school?.school ?? null,
      courses: viewerSignalRes.data?.courses ?? null,
    };
    const cache = await cachedConnectionPrompts(supabase, user.id, [profile.id]);
    matchPrompt =
      cache.get(profile.id) ??
      (await connectionPrompt(
        supabase,
        user.id,
        viewerSignal,
        {
          id: profile.id,
          name: displayName,
          year: profile.year,
          major: profile.major,
          skills: profile.skills,
          goals: profile.goals,
          bio: profile.bio,
          school,
          courses: profile.courses,
        },
        isPro(viewerSignalRes.data ?? { is_pro: false })
      ));
  }

  const metaParts = [
    school,
    profile.year ? YEAR_LABEL[profile.year] : null,
    profile.major,
  ].filter(Boolean);
  // Max one middle-dot per line: first item gets the dot separator, any
  // further items are comma-joined after it.
  const metaLine =
    metaParts.length <= 1 ? metaParts[0] ?? null : `${metaParts[0]} · ${metaParts.slice(1).join(", ")}`;

  return (
    <main className="page-enter mx-auto max-w-2xl px-4 py-6 sm:px-5 sm:py-8">
      {/* Identity header — banner with the avatar overlapping its bottom edge */}
      <section className="card overflow-hidden">
        {profile.banner_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.banner_url} alt="" className="aspect-[3/1] w-full object-cover" />
        ) : (
          <div
            aria-hidden
            className="aspect-[4/1] w-full"
            style={{ background: "linear-gradient(120deg, color-mix(in srgb, var(--blue) 14%, var(--surface-card)) 0%, var(--surface-card) 62%)" }}
          />
        )}

        <div className="px-5 pb-5 sm:px-6 sm:pb-6">
          {/* avatar pulls up over the banner; primary action sits to its right */}
          <div className="flex items-end justify-between gap-3">
            {profile.avatar_url ? (
              <AvatarImage
                src={profile.avatar_url}
                alt=""
                style={profile.accent_color ? { borderColor: profile.accent_color } : undefined}
                className="-mt-12 h-24 w-24 shrink-0 rounded-full border-4 border-[var(--surface-card)] object-cover sm:-mt-14 sm:h-28 sm:w-28"
              />
            ) : (
              <div
                style={profile.accent_color ? { borderColor: profile.accent_color } : undefined}
                className="-mt-12 grid h-24 w-24 shrink-0 place-items-center rounded-full border-4 border-[var(--surface-card)] bg-[var(--featured-surface)] text-3xl font-semibold text-[var(--ink-muted)] sm:-mt-14 sm:h-28 sm:w-28"
              >
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}

            {isOwner ? (
              <Link href="/profile/edit" className="btn-ghost shrink-0 !rounded-full !px-4 !py-1.5 text-sm">
                Edit profile
              </Link>
            ) : user ? (
              <div className="shrink-0">
                <ProfileActions
                  username={profile.username}
                  targetId={profile.id}
                  followState={followState}
                  blocked={isBlocked}
                  amIBlocking={amIBlocking}
                />
              </div>
            ) : null}
          </div>

          <div className="mt-3">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <h1 className="text-2xl font-semibold tracking-[-0.025em] sm:text-[28px]">{displayName}</h1>
              <UserBadges isPro={profile.is_pro} isFounder={profile.is_founder} isCampusFounder={profile.is_campus_founder} />
            </div>
            <p className="mt-0.5 text-[15px] text-[var(--ink-muted)]">@{profile.username}</p>

            {metaLine && <p className="mt-2 text-sm text-[var(--ink-muted)]">{metaLine}</p>}
            {matchPrompt && (
              <p className="mt-2 text-sm text-[var(--ink-muted)]">
                <span aria-hidden="true">✦</span> {matchPrompt}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1">
              <Stat value={Number(counts.posts)} label="posts" />
              <Stat value={Number(counts.followers)} label="followers" />
              <Stat value={Number(counts.following)} label="following" />
            </div>
          </div>

          {profile.bio && (
            <p className="mt-5 max-w-[60ch] whitespace-pre-line break-words text-[17px] leading-[1.6] text-[var(--ink)]">
              {profile.bio}
            </p>
          )}
        </div>
      </section>

      {/* Identity canvas — activity, goals, skills, courses as tactile tiles */}
      {(canSeeHeatmap || profile.goals || (profile.skills?.length ?? 0) > 0 || (profile.courses?.length ?? 0) > 0) && (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {canSeeHeatmap && (
            <section className="card card-hover p-5 shadow-paper sm:col-span-2 sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-[var(--ink)]">Activity</h2>
                {streak && (streak.current_streak > 0 || streak.longest_streak > 0) && (
                  <p className="text-sm text-[var(--ink-muted)]">
                    <b className="font-semibold text-[var(--blue)]">{streak.current_streak}-day streak</b>
                    {streak.longest_streak > streak.current_streak ? ` · best ${streak.longest_streak}` : ""}
                  </p>
                )}
              </div>
              <ContributionHeatmap data={heatmap} />
              {isOwner && streak && streak.current_streak > 0 && !streak.today_earned && (
                <p className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-3 py-2 text-sm text-[var(--ink-muted)]">
                  Post today to keep your {streak.current_streak}-day streak.
                </p>
              )}
            </section>
          )}

          {profile.goals && (
            <section className="card card-hover p-5 shadow-paper sm:col-span-2 sm:p-6">
              <h2 className="text-sm font-semibold text-[var(--ink)]">Goals</h2>
              <p className="mt-1.5 whitespace-pre-line break-words text-[15px] leading-[1.55] text-[var(--ink-muted)]">
                {profile.goals}
              </p>
            </section>
          )}

          {profile.skills && profile.skills.length > 0 && (
            <section className={`card card-hover p-5 shadow-paper sm:p-6 ${profile.courses && profile.courses.length > 0 ? "" : "sm:col-span-2"}`}>
              <h2 className="mb-3 text-sm font-semibold text-[var(--ink)]">Skills</h2>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((s) => (
                  <span key={s} className="rounded-full border border-[var(--border)] bg-[var(--canvas)] px-3 py-1 text-sm text-[var(--ink-muted)]">
                    {s}
                  </span>
                ))}
              </div>
            </section>
          )}

          {profile.courses && profile.courses.length > 0 && (
            <section className={`card card-hover p-5 shadow-paper sm:p-6 ${profile.skills && profile.skills.length > 0 ? "" : "sm:col-span-2"}`}>
              <h2 className="mb-3 text-sm font-semibold text-[var(--ink)]">Courses</h2>
              <div className="flex flex-wrap gap-2">
                {profile.courses.map((c) => (
                  <span key={c} className="rounded-full border border-[var(--border)] bg-[var(--canvas)] px-3 py-1 text-sm text-[var(--ink-muted)]">
                    {c}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {!isOwner && user && (!isBlocked || amIBlocking) && (
        <div className="mt-3 flex justify-end">
          <BlockButton targetId={profile.id} initialBlocked={amIBlocking} />
        </div>
      )}

      {isOwner && (
        <ProfileViewers
          isPro={profileIsPro}
          count={profileViews.length}
          recent={profileIsPro ? profileViews.slice(0, 30) : []}
        />
      )}

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-[var(--ink)]">Posts</h2>

        {isBlocked ? (
          <div className="card px-6 py-12 text-center">
            <p className="font-medium text-[var(--ink)]">Posts unavailable</p>
            <p className="mt-1.5 text-sm text-[var(--ink-muted)]">
              You and @{profile.username} cannot see each other&apos;s posts.
            </p>
          </div>
        ) : contentHidden ? (
          <div className="card px-6 py-12 text-center">
            <p className="font-medium text-[var(--ink)]">This account is private</p>
            <p className="mt-1.5 text-sm text-[var(--ink-muted)]">
              Follow @{profile.username} to see their posts.
            </p>
          </div>
        ) : timeline.length === 0 ? (
          <div className="card px-6 py-12 text-center">
            <p className="font-medium text-[var(--ink)]">
              {isOwner ? "No posts yet" : "No posts yet"}
            </p>
            <p className="mt-1.5 text-sm text-[var(--ink-muted)]">
              {isOwner ? "Share something to fill your feed." : `@${profile.username} has not posted yet.`}
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
