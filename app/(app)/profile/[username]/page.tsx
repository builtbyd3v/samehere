import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, cache } from "react";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { cookies } from "next/headers";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { FollowState } from "@/components/profile/FollowButton";
import ProfileActions from "@/components/profile/ProfileActions";
import BlockButton from "@/components/profile/BlockButton";
import { POST_SELECT, withEngagement, type PostRow } from "@/components/feed/PostCard";
import FeedTimeline from "@/components/feed/FeedTimeline";
import ProfileMatchPrompt from "@/components/profile/ProfileMatchPrompt";
import ProfileActivitySection from "@/components/profile/ProfileActivitySection";
import ProfileViewersSection from "@/components/profile/ProfileViewersSection";
import { Skeleton } from "@/components/ui/Skeleton";
import { attachSignedMedia } from "@/lib/media";
import { fetchQuotedReposts, toQuotedRepost } from "@/lib/feed-quotes";
import { fetchPlainReposts } from "@/lib/feed-reposts";
import { fetchViewerMineState } from "@/lib/feed-engagement";
import { mergeFeedTimeline } from "@/lib/feed-timeline";
import UserBadges from "@/components/profile/UserBadges";
import AvatarImage from "@/components/ui/AvatarImage";
import ContributionHeatmap, { type HeatmapDay } from "@/components/profile/ContributionHeatmap";
import { isPro } from "@/lib/pro";
import { PROFILE_THEMES, isProfileTheme, themeCssVars } from "@/lib/themes";

const PROFILE_SELECT =
  "id, username, display_name, avatar_url, banner_url, year, major, bio, goals, is_private, heatmap_visibility, is_pro, pro_until, is_founder, is_campus_founder, accent_color, profile_theme, verified_student";

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

// Logged-out render. Uses a plain anon supabase-js client (not the cookie-bound
// session client) so RLS/definer-fn checks run as true anon — same pattern as
// lib/founder.ts. The RPCs below (get_public_profile, get_public_profile_counts,
// get_public_heatmap) are SECURITY DEFINER + anon-granted and enforce privacy
// themselves; this component renders exactly what they return and never
// re-derives the is_private field-nulling rule itself.
function anonSupabase() {
  return createAnonClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// The RPCs below are anon-granted SECURITY DEFINER functions not yet present
// in the generated Database types (types/database.types.ts hasn't been
// regenerated since the migration landed). A plain (untyped) client can't call
// `.rpc(name, args)` with useful inference either way, so cast once here and
// take rows ourselves instead of chaining `.returns()`/`.maybeSingle()` (which
// needs the real generated types to resolve correctly).
function callRpc<T>(supabase: ReturnType<typeof anonSupabase>, fn: string, args: Record<string, unknown>) {
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: T[] | null }>;
  return rpc(fn, args).then((r) => r.data ?? []);
}

type PublicProfile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_pro: boolean;
  is_founder: boolean;
  is_campus_founder: boolean;
  is_private: boolean;
  heatmap_visibility: string;
  year: string | null;
  major: string | null;
  bio: string | null;
  goals: string | null;
  school: string | null;
  verified_student: boolean;
};

type PublicCounts = { posts: number; followers: number; following: number };

// generateMetadata runs with no session (crawlers, logged-out visitors), so it
// must read through the anon-granted definer, not the cookie-bound client.
// cache() dedupes it against PublicProfileView within one render pass.
const getPublicProfileMeta = cache(async (username: string) => {
  const rows = await callRpc<PublicProfile>(anonSupabase(), "get_public_profile", { p_username: username });
  return rows[0] ?? null;
});

async function PublicProfileView({ username }: { username: string }) {
  const supabase = anonSupabase();
  const profile = (await callRpc<PublicProfile>(supabase, "get_public_profile", { p_username: username }))[0] ?? null;

  if (!profile) notFound();

  const counts = (await callRpc<PublicCounts>(supabase, "get_public_profile_counts", { p_profile_id: profile.id }))[0];
  const c = counts ?? { posts: 0, followers: 0, following: 0 };

  // Private accounts render nothing past this — get_public_profile already
  // nulled every other field for them, so this heatmap call is the only extra
  // gate we add ourselves (it's a separate RPC, not a field on the profile row).
  const showHeatmap = !profile.is_private && profile.heatmap_visibility === "public";
  const heatmapRaw = showHeatmap
    ? await callRpc<{ day: string; points: number }>(supabase, "get_public_heatmap", { p_profile_id: profile.id })
    : [];
  const heatmap: HeatmapDay[] = heatmapRaw.map((d) => ({ ...d, breakdown: {} }));

  const displayName = profile.display_name ?? profile.username;
  const metaParts = [profile.school, profile.year ? YEAR_LABEL[profile.year] : null, profile.major].filter(Boolean);
  const metaLine =
    metaParts.length <= 1 ? metaParts[0] ?? null : `${metaParts[0]} · ${metaParts.slice(1).join(", ")}`;

  return (
    <main className="page-enter mx-auto max-w-2xl px-4 py-6 sm:px-5 sm:py-8">
      <section className="card overflow-hidden">
        <div
          aria-hidden
          className="aspect-[4/1] w-full"
          style={{ background: "linear-gradient(120deg, color-mix(in srgb, var(--blue) 14%, var(--surface-card)) 0%, var(--surface-card) 62%)" }}
        />
        <div className="px-5 pb-5 sm:px-6 sm:pb-6">
          {profile.avatar_url ? (
            <AvatarImage
              src={profile.avatar_url}
              alt=""
              pro={profile.is_pro}
              priority
              className="-mt-12 h-24 w-24 shrink-0 rounded-full border-4 border-[var(--surface-card)] object-cover sm:-mt-14 sm:h-28 sm:w-28"
            />
          ) : (
            <div className="-mt-12 grid h-24 w-24 shrink-0 place-items-center rounded-full border-4 border-[var(--surface-card)] bg-[var(--featured-surface)] text-3xl font-semibold text-[var(--ink-muted)] sm:-mt-14 sm:h-28 sm:w-28">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="mt-3">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <h1 className="text-2xl font-semibold tracking-[-0.025em] sm:text-[28px]">{displayName}</h1>
              <UserBadges isPro={profile.is_pro} isFounder={profile.is_founder} isCampusFounder={profile.is_campus_founder} isVerifiedStudent={profile.verified_student} />
            </div>
            <p className="mt-0.5 text-[15px] text-[var(--ink-muted)]">@{profile.username}</p>
            {metaLine && <p className="mt-2 text-sm text-[var(--ink-muted)]">{metaLine}</p>}

            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1">
              <Stat value={Number(c.posts)} label="posts" />
              <Stat value={Number(c.followers)} label="followers" />
              <Stat value={Number(c.following)} label="following" />
            </div>
          </div>

          {profile.bio && (
            <p className="mt-5 max-w-[60ch] whitespace-pre-line break-words text-[17px] leading-[1.6] text-[var(--ink)]">
              {profile.bio}
            </p>
          )}
        </div>
      </section>

      {profile.is_private ? (
        <div className="card mt-3 px-6 py-8 text-center">
          <p className="font-medium text-[var(--ink)]">This account is private</p>
        </div>
      ) : (
        (showHeatmap || profile.goals) && (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {showHeatmap && (
              <section className="card p-5 shadow-paper sm:col-span-2 sm:p-6">
                <h2 className="mb-4 text-sm font-semibold text-[var(--ink)]">Activity</h2>
                <ContributionHeatmap data={heatmap} />
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
          </div>
        )
      )}

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-[var(--ink)]">Posts</h2>
        <div className="card px-6 py-12 text-center">
          <p className="font-medium text-[var(--ink)]">Sign in to see their posts</p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href="/login" className="btn-ghost !rounded-full !px-4 !py-1.5 text-sm">
              Sign in
            </Link>
            <Link href="/signup" className="btn-primary !rounded-full !px-4 !py-1.5 text-sm">
              Sign up
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;

  // Metadata is generated for crawlers and for logged-out visitors, i.e. with NO
  // session. The session client can't see `profiles` at all (its SELECT policy
  // requires auth.uid() is not null), so reading through it returned null and
  // every shared link unfurled as "Profile not found". Read the same anon-granted
  // definer the page body uses. It nulls a private account's fields itself, so a
  // private profile falls back to the generic description below rather than
  // leaking a bio into a link preview.
  const profile = await getPublicProfileMeta(username);

  // noindex/nofollow, not disabled: link-preview crawlers (Twitterbot,
  // Slackbot, etc.) fetch the page and parse <head> directly — they don't
  // consult robots — so OG/Twitter unfurls below still work. This only keeps
  // the page out of search indexes. Flipping it on is a one-line product call.
  const robots = { index: false, follow: false };

  if (!profile) return { title: "Profile not found", robots };

  const name = profile.display_name ?? username;

  // Deliberately NOT the bio. A bio is something a student wrote for other
  // students; pushing it into every Discord, Slack and Twitter embed publishes
  // it to anyone who sees the link — and it stays in their unfurl caches long
  // after the account goes private. The card itself carries the identity; the
  // description just says what the link is for.
  const description = `Join @${username} on samehere. Verified students only.`;

  // Deliberately NO `images` here. An explicit openGraph.images overrides the
  // file-based opengraph-image route, which is what renders the heatmap card —
  // the whole point of the share image. Setting it to the avatar would silently
  // replace a 1200x630 contribution graph with a small round photo.
  return {
    title: `${name} (@${username})`,
    description,
    robots,
    openGraph: { title: `${name} on samehere`, description, type: "profile" },
    twitter: { card: "summary_large_image", title: `${name} on samehere`, description },
  };
}

// Anon crawler unfurls and logged-out visits are the common case for this
// route; skip constructing the cookie-bound Supabase client entirely when no
// Supabase auth cookie is present at all. See plans/006-request-layer-dedup.md
// for the same predicate used in lib/supabase/middleware.ts.
async function hasAuthCookie() {
  const store = await cookies();
  return store.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  if (!(await hasAuthCookie())) return <PublicProfileView username={username} />;

  const supabase = await createClient();

  const [{ data: { user } }, profile] = await Promise.all([
    supabase.auth.getUser(),
    getProfileByUsername(username),
  ]);

  if (!user) return <PublicProfileView username={username} />;

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
      .returns<PostRow[]>(),
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
  // Shared signing batch: ONE Storage round trip for every original post
  // surfaced by posts + quotes + reposts (was 3 separate attachSignedMedia
  // calls -- see plan 010 Phase 1).
  const postRows = postsRes.data ?? [];
  const allForSigning = [...postRows, ...quotesRes.map((q) => q.post), ...repostsRes.map((r) => r.post)];
  const signedById = new Map(
    (allForSigning.length ? await attachSignedMedia(supabase, allForSigning) : []).map((p) => [p.id, p]),
  );

  const postIds = [...signedById.keys()];
  const repostIds = quotesRes.map((q) => q.id);
  const mine = await fetchViewerMineState(supabase, viewerId, postIds, repostIds);
  const engagedById = new Map(withEngagement([...signedById.values()], mine).map((p) => [p.id, p]));

  const posts = postRows.map((r) => engagedById.get(r.id)!);
  const quotes = quotesRes.map((r) => toQuotedRepost(r, engagedById.get(r.post.id)!, mine));
  const reposts = repostsRes.map((r) => ({
    id: r.id,
    created_at: r.created_at,
    reposter_id: r.user_id,
    reposter: r.reposter,
    original: engagedById.get(r.post.id)!,
  }));
  const isBlocked = !!(blockedIdsRes.data ?? []).includes(profile.id);
  const amIBlocking = !!myBlockRes.data;
  const profileIsPro = isPro(profile);

  const followState: FollowState =
    relRes.data?.status === "accepted" ? "following" : relRes.data?.status === "pending" ? "pending" : "none";

  const contentHidden = (profile.is_private && !isOwner && !isAcceptedFollower) || isBlocked;
  const timeline = contentHidden ? [] : mergeFeedTimeline(posts, quotes, reposts).slice(0, 20);
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

  // Banner, accent colour, and profile theme are Pro perks. The DB keeps all
  // three columns when a subscription lapses (guard_profile_privileged only
  // freezes them), so the gate has to live here — otherwise a lapsed
  // subscriber keeps wearing them. Rendering off is_pro, not a nulled column,
  // means resubscribing restores them instantly with nothing to redo.
  const pro = isPro(profile);
  const bannerUrl = pro ? profile.banner_url : null;
  const theme = pro && isProfileTheme(profile.profile_theme) ? profile.profile_theme : null;
  // Precedence: a theme sets the accent when present; accent_color is the
  // manual escape hatch used only when no theme is set (see lib/themes.ts).
  const accentColor = theme ? PROFILE_THEMES[theme].accent : pro ? profile.accent_color : null;
  const themeVars = themeCssVars(theme);

  return (
    <main className="page-enter mx-auto max-w-2xl px-4 py-6 sm:px-5 sm:py-8" style={themeVars}>
      {/* Identity header — banner with the avatar overlapping its bottom edge.
          Theme tint renders as a soft outline glow here, not a wash — the
          gradient below stays blue-only per DESIGN.md ("blue is kept ONLY
          for the profile card + heatmap"). */}
      <section
        className="card overflow-hidden"
        style={theme ? { boxShadow: "0 0 0 1px var(--profile-tint)" } : undefined}
      >
        {bannerUrl ? (
          // ponytail: plain <img>, not next/image. `fill` is position:absolute,
          // which paints above the in-flow avatar that pulls up over the banner
          // with a negative margin. The optimizer also flattened animated
          // banners to one re-encoded frame. Both problems vanish with an
          // in-flow <img>, and banners are user uploads the optimizer barely
          // helps. Revisit only if banner bytes become a real cost.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bannerUrl} alt="" className="aspect-[3/1] w-full object-cover" />
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
                pro={pro}
                style={accentColor ? { borderColor: accentColor } : undefined}
                className="-mt-12 h-24 w-24 shrink-0 rounded-full border-4 border-[var(--surface-card)] object-cover sm:-mt-14 sm:h-28 sm:w-28"
              />
            ) : (
              <div
                style={accentColor ? { borderColor: accentColor } : undefined}
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
                  viewerId={user.id}
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
              <UserBadges isPro={profile.is_pro} isFounder={profile.is_founder} isCampusFounder={profile.is_campus_founder} isVerifiedStudent={profile.verified_student} />
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
                    goals: profile.goals,
                    bio: profile.bio,
                    school,
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

      {/* Identity canvas — activity, goals as tactile tiles */}
      {(canSeeHeatmap || profile.goals) && (
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
