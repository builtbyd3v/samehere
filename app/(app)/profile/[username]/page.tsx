import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Suspense, cache } from "react";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAnimatedAvatarUrl } from "@/lib/avatar";
import type { FollowState } from "@/components/profile/FollowButton";
import ProfileActions from "@/components/profile/ProfileActions";
import BlockButton from "@/components/profile/BlockButton";
import PostCard, { POST_SELECT, type FeedPost } from "@/components/feed/PostCard";
import FeedTimeline from "@/components/feed/FeedTimeline";
import ProfileMatchPrompt from "@/components/profile/ProfileMatchPrompt";
import ProfileActivitySection from "@/components/profile/ProfileActivitySection";
import ProfileViewersSection from "@/components/profile/ProfileViewersSection";
import { Skeleton } from "@/components/ui/Skeleton";
import { attachSignedMedia } from "@/lib/media";
import { fetchQuotedReposts } from "@/lib/feed-quotes";
import { fetchPlainReposts } from "@/lib/feed-reposts";
import { mergeFeedTimeline } from "@/lib/feed-timeline";
import UserBadges from "@/components/profile/UserBadges";
import AvatarImage from "@/components/ui/AvatarImage";
import { isPro } from "@/lib/pro";

const PROFILE_SELECT =
  "id, username, display_name, avatar_url, banner_url, year, major, bio, goals, skills, courses, is_private, heatmap_visibility, is_pro, is_founder, is_campus_founder, accent_color";

// Shared by generateMetadata and the page component so they hit one query
// instead of two — React's cache() dedupes by argument (username) within a
// single render pass. Takes only the primitive username (not a supabase
// client instance) so both call sites land on the same cache entry.
const getProfileByUsername = cache(async (username: string) => {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select(PROFILE_SELECT).eq("username", username).maybeSingle();
  return data;
});

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
  const profile = await getProfileByUsername(username);

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

  const [{ data: { user } }, profile] = await Promise.all([
    supabase.auth.getUser(),
    getProfileByUsername(username),
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

  const [schoolRes, countRes, relRes, postsRes, quotesRes, repostsRes, blockedIdsRes, myBlockRes] = await Promise.all([
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
  const isBlocked = !!(blockedIdsRes.data ?? []).includes(profile.id);
  const amIBlocking = !!myBlockRes.data;
  const profileIsPro = isPro(profile);

  const followState: FollowState =
    relRes.data?.status === "accepted" ? "following" : relRes.data?.status === "pending" ? "pending" : "none";

  const contentHidden = (profile.is_private && !isOwner && !isAcceptedFollower) || isBlocked;
  const timeline = contentHidden ? [] : mergeFeedTimeline(posts, quotesRes, repostsRes).slice(0, 20);
  const canSeeHeatmap = isOwner || isAcceptedFollower || profile.heatmap_visibility === "public";
  // "Why you two match" renders only where post content would be visible to
  // this viewer (mirrors contentHidden: excludes private-non-follower and
  // blocked) — see the ProfileMatchPrompt Suspense boundary below.
  const showMatchPrompt = !isOwner && !contentHidden;

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
          <div className="relative aspect-[3/1] w-full">
            <Image
              src={profile.banner_url}
              alt=""
              fill
              sizes="(min-width: 672px) 672px, 100vw"
              className="object-cover"
              // Animated banners must bypass the optimizer, which would flatten
              // them to a single re-encoded frame. Same rule as AvatarImage.
              unoptimized={isAnimatedAvatarUrl(profile.banner_url)}
            />
          </div>
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
            {user && showMatchPrompt && (
              <Suspense fallback={<Skeleton className="mt-2 h-4 w-56" />}>
                <ProfileMatchPrompt
                  viewerId={user.id}
                  candidate={{
                    id: profile.id,
                    name: displayName,
                    year: profile.year,
                    major: profile.major,
                    skills: profile.skills,
                    goals: profile.goals,
                    bio: profile.bio,
                    school,
                    courses: profile.courses,
                  }}
                />
              </Suspense>
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
            <Suspense
              fallback={
                <section className="card p-5 shadow-paper sm:col-span-2 sm:p-6">
                  <Skeleton className="mb-4 h-4 w-24" />
                  <Skeleton className="h-28 w-full" />
                </section>
              }
            >
              <ProfileActivitySection profileId={profile.id} isOwner={isOwner} />
            </Suspense>
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
        <Suspense
          fallback={
            <section className="card mt-3 p-5 sm:p-6">
              <Skeleton className="mb-3 h-4 w-40" />
              <Skeleton className="h-9 w-full" />
            </section>
          }
        >
          <ProfileViewersSection profileId={profile.id} profileIsPro={profileIsPro} />
        </Suspense>
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
