import type { Metadata } from "next";
import Link from "next/link";
import { cache, Suspense, type CSSProperties, type ReactNode } from "react";
import type {
  PortfolioProject,
  PublicPortfolioEducation,
  PublicPortfolioExperience,
  PublicPortfolioProject,
  PublicPortfolioProjection,
} from "@/types/portfolio";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { FollowState } from "@/components/profile/FollowButton";
import ProfileActions from "@/components/profile/ProfileActions";
import BlockButton from "@/components/profile/BlockButton";
import ProfileActivitySection from "@/components/profile/ProfileActivitySection";
import ProfileActivityBlock from "@/components/profile/ProfileActivityBlock";
import ProfileRecentPosts from "@/components/profile/ProfileRecentPosts";
import ContributionHeatmap, { type HeatmapDay } from "@/components/profile/ContributionHeatmap";
import UserBadges from "@/components/profile/UserBadges";
import AvatarBase from "@/components/ui/Avatar";
import { HeatmapSkeleton, PortfolioSectionsFallback, ProfilePostsSkeleton } from "@/components/ui/Skeleton";
import { isPro } from "@/lib/pro";
import { PROFILE_THEMES, isProfileTheme, themeCssVars } from "@/lib/themes";
import { pickPrimaryEducation } from "@/lib/education-options";
import { createAnonPortfolioClient, hasPortfolioAuthCookie, portfolioReadClient, type PortfolioClient } from "@/lib/portfolio/client";
import { getOwnerGithubConnection, getOwnerGithubDays, loadPublicPortfolioBundle } from "@/lib/portfolio/public";
import { listOwnerProjects } from "@/lib/portfolio/owner";
import { metadataDescription, profileIntro, publicSectionVisible, robotsForProjection } from "@/lib/portfolio/projection";
import { effectiveSectionOrder, eligiblePublicView } from "@/lib/portfolio/metrics";
import { PORTFOLIO_SECTIONS } from "@/lib/portfolio/validation";
import TrackPortfolioView from "@/components/portfolio/TrackPortfolioView";
import { OwnerAnalyticsSection, PortfolioAnalyticsFallback } from "@/components/portfolio/PortfolioAnalytics";
import SharePortfolioButton from "@/components/portfolio/SharePortfolioButton";
import PortfolioBanner from "@/components/portfolio/PortfolioBanner";
import UnavailableNotice from "@/components/portfolio/UnavailableNotice";
import {
  ActivitySection,
  EducationList,
  ExperienceList,
  IntroSection,
  OwnerProjects,
  PublicProjectList,
} from "@/components/portfolio/ProfileSections";
const PROFILE_SELECT =
  "id, username, display_name, avatar_url, banner_url, year, major, bio, goals, open_to, is_private, heatmap_visibility, is_pro, pro_until, is_founder, is_campus_founder, profile_theme, verified_student, is_bot";
const PROFILE_SELECT_FALLBACK =
  "id, username, display_name, avatar_url, banner_url, year, major, bio, goals, is_private, heatmap_visibility, is_pro, pro_until, is_founder, is_campus_founder, profile_theme, verified_student, is_bot";

const getProfileByUsername = cache(async (username: string) => {
  const supabase = await createClient();
  const first = await supabase.from("profiles").select(PROFILE_SELECT).eq("username", username).maybeSingle();
  if (!first.error) return first.data;
  const fallback = await supabase.from("profiles").select(PROFILE_SELECT_FALLBACK).eq("username", username).maybeSingle();
  return fallback.data;
});

const loadViewerPublicMeta = cache(async (username: string, hasAuth: boolean) => {
  const client = await portfolioReadClient(hasAuth);
  const [{ data }, portfolio] = await Promise.all([
    client.rpc("get_public_profile", { p_username: username }),
    loadPublicPortfolioBundle(client, username),
  ]);
  return { profile: data?.[0] ?? null, portfolio };
});

function Stat({ value, label, accent, href }: { value: number; label: string; accent?: boolean; href?: string }) {
  const content = (
    <span className="text-[13px] text-[var(--ink-muted)]">
      <b
        className={`font-semibold tabular-nums tracking-[-0.01em] ${accent ? "" : "text-[var(--ink)]"}`}
        style={accent ? { color: "var(--profile-accent)" } : undefined}
      >
        {value.toLocaleString()}
      </b>{" "}
      <span>{label}</span>
    </span>
  );
  return href ? (
    <Link href={href} className="hover:underline">
      {content}
    </Link>
  ) : (
    content
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const hasAuth = await hasPortfolioAuthCookie();
  const { profile, portfolio } = await loadViewerPublicMeta(username, hasAuth);
  const robots = robotsForProjection(portfolio.ok ? portfolio.data.projection : null, !portfolio.ok && Boolean(portfolio.unavailable));
  if (!profile) return { title: "Profile not found", robots };
  const name = profile.display_name ?? username;
  const description = metadataDescription(username);
  return {
    title: `${name} (@${username})`,
    description,
    robots,
    openGraph: { title: `${name} on samehere`, description, type: "profile" },
    twitter: { card: "summary_large_image", title: `${name} on samehere`, description },
  };
}

function OwnerBar({
  username,
  previewPublic,
}: {
  username: string;
  previewPublic: boolean;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <Link href="/profile/edit" className="btn-ghost !rounded-full !px-4 !py-1.5 text-sm">
        Edit profile
      </Link>
      <Link href="/profile/projects/new" className="btn-primary !rounded-full !px-4 !py-1.5 text-sm">
        Add project
      </Link>
      <Link
        href={previewPublic ? `/profile/${username}` : `/profile/${username}?preview=public`}
        className="btn-ghost !rounded-full !px-4 !py-1.5 text-sm"
      >
        {previewPublic ? "Owner view" : "Public preview"}
      </Link>
    </div>
  );
}

function PortfolioBody({
  projection,
  unavailable,
  isOwner,
  previewPublic,
  ownerProjects,
  publicProjects,
  experience,
  education,
  logos,
  activity,
  posts,
  currentPro,
  intro,
}: {
  projection: PublicPortfolioProjection | null;
  unavailable: boolean;
  isOwner: boolean;
  previewPublic: boolean;
  ownerProjects: PortfolioProject[];
  publicProjects: PublicPortfolioProject[];
  experience: PublicPortfolioExperience[];
  education: Array<PublicPortfolioEducation & { school_domain?: string | null }>;
  logos: Map<string, string | null>;
  activity: ReactNode;
  posts: ReactNode;
  currentPro: boolean;
  intro: { bio: string | null; goals: string | null; open_to: string[] };
}) {
  if (unavailable) {
    return (
      <>
        {isOwner && <UnavailableNotice />}
        {isOwner && !previewPublic && (
          <IntroSection bio={intro.bio} goals={intro.goals} openTo={intro.open_to} />
        )}
        {posts}
      </>
    );
  }
  const order = effectiveSectionOrder(projection?.section_order ?? [], currentPro);
  const show = (section: (typeof order)[number]) => {
    if (isOwner && !previewPublic) return true;
    if (!projection) return false;
    return publicSectionVisible(projection, section);
  };
  return (
    <div className="portfolio-stack mt-6">
      {order.map((section) => {
        if (section === "intro" && show("intro")) {
          return <IntroSection key="intro" bio={intro.bio} goals={intro.goals} openTo={intro.open_to} />;
        }
        if (section === "projects" && show("projects")) {
          return isOwner && !previewPublic ? (
            <OwnerProjects key="projects" projects={ownerProjects} previewPublic={false} />
          ) : (
            <PublicProjectList key="projects" projects={publicProjects} />
          );
        }
        if (section === "activity" && show("activity")) {
          return <div key="activity">{activity}</div>;
        }
        if (section === "experience" && show("experience")) {
          return <ExperienceList key="experience" items={experience} logos={logos} />;
        }
        if (section === "education" && show("education")) {
          return <EducationList key="education" items={education} />;
        }
        if (section === "posts" && show("posts")) {
          return <div key="posts">{posts}</div>;
        }
        return null;
      })}
    </div>
  );
}

async function PublicHeatmapFallback({
  client,
  profileId,
}: {
  client: PortfolioClient;
  profileId: string;
}) {
  const { data } = await client.rpc("get_public_heatmap", { p_profile_id: profileId });
  const heatmap: HeatmapDay[] = (data ?? []).map((d) => ({
    day: d.day,
    points: d.points,
    breakdown: {},
  }));
  if (heatmap.length === 0) return null;
  return (
    <section className="card-surface mt-3 p-5 sm:p-6">
      <h2 className="eyebrow mb-4">Activity</h2>
      <ContributionHeatmap data={heatmap} />
    </section>
  );
}

async function PublicPortfolioBelow({
  username,
  profile,
  client,
  bundlePromise,
}: {
  username: string;
  profile: {
    id: string;
    username: string;
    display_name: string | null;
    bio: string | null;
    goals: string | null;
    open_to: string[] | null;
    is_private: boolean;
    is_pro: boolean;
    heatmap_visibility: string | null;
  };
  client: PortfolioClient;
  bundlePromise: ReturnType<typeof loadPublicPortfolioBundle>;
}) {
  const bundle = await bundlePromise;
  const projection = bundle.ok ? bundle.data.projection : null;
  const intro = profileIntro(
    {
      id: profile.id,
      username: profile.username,
      display_name: profile.display_name,
      bio: profile.bio,
      goals: profile.goals,
      open_to: profile.open_to,
      is_private: profile.is_private,
    },
    projection,
    "public"
  );
  const trackView = eligiblePublicView({
    isOwner: false,
    previewPublic: false,
    isPrivate: profile.is_private,
    isBlocked: false,
    isSuspended: false,
    hasRenderedPublicContent: Boolean(
      projection && PORTFOLIO_SECTIONS.some((section) => publicSectionVisible(projection, section))
    ),
  });
  const posts = (
    <section className="mt-6">
      <h2 className="eyebrow mb-3">Posts</h2>
      <p className="flex flex-wrap items-center gap-2 text-sm text-[var(--ink-muted)]">
        Sign in to see their posts
        <Link href="/login" className="btn-ghost !rounded-full !px-3 !py-1 text-xs">
          Sign in
        </Link>
        <Link href="/signup" className="btn-primary !rounded-full !px-3 !py-1 text-xs">
          Sign up
        </Link>
      </p>
    </section>
  );

  return (
    <>
      {trackView && <TrackPortfolioView username={username} />}
      {!bundle.ok && bundle.unavailable ? (
        <>
          {profile.heatmap_visibility === "public" && (
            <Suspense fallback={<HeatmapSkeleton />}>
              <PublicHeatmapFallback client={client} profileId={profile.id} />
            </Suspense>
          )}
          {posts}
        </>
      ) : (
        <PortfolioBody
          projection={projection}
          unavailable={!bundle.ok && Boolean(bundle.unavailable)}
          isOwner={false}
          previewPublic
          ownerProjects={[]}
          publicProjects={bundle.ok ? bundle.data.sections.projects : []}
          experience={bundle.ok ? bundle.data.sections.experience : []}
          education={bundle.ok ? bundle.data.sections.education : []}
          logos={new Map()}
          activity={
            <ActivitySection
              samehere={bundle.ok ? bundle.data.samehere : []}
              github={bundle.ok ? bundle.data.github : []}
              connection={null}
              streak={null}
              isOwner={false}
              samehereKnown={bundle.ok ? bundle.data.samehereKnown : false}
            />
          }
          currentPro={profile.is_pro}
          intro={intro}
          posts={posts}
        />
      )}
    </>
  );
}

async function PublicProfileView({ username }: { username: string }) {
  const client = createAnonPortfolioClient();
  const { data: profileRows } = await client.rpc("get_public_profile", { p_username: username });
  const profile = profileRows?.[0] ?? null;
  if (!profile) notFound();

  const countsPromise = client.rpc("get_public_profile_counts", { p_profile_id: profile.id });
  const bundlePromise = loadPublicPortfolioBundle(client, username);
  const { data: countRows } = await countsPromise;
  const counts = countRows?.[0] ?? { posts: 0, followers: 0, following: 0 };
  const displayName = profile.display_name ?? profile.username;
  const metaParts = [profile.school, profile.major].filter(Boolean);
  const metaLine = metaParts.length <= 1 ? metaParts[0] ?? null : `${metaParts[0]} · ${metaParts.slice(1).join(", ")}`;
  const bannerUrl = profile.banner_url;
  const accentColor = profile.accent_color;

  return (
    <main
      className="page-enter mx-auto max-w-2xl px-4 py-6 sm:px-5 sm:py-8"
      style={accentColor ? ({ "--profile-accent": accentColor } as CSSProperties) : undefined}
    >
      <section className="card-raised portfolio-enter-header overflow-hidden">
        <PortfolioBanner username={profile.username} src={bannerUrl} accent={accentColor} />
        <div className="px-5 pb-5 sm:px-6 sm:pb-6">
          <div className="flex flex-col gap-3 min-[391px]:flex-row min-[391px]:items-end min-[391px]:justify-between">
            <AvatarBase
              src={profile.avatar_url}
              seed={profile.username}
              name={displayName}
              pro={profile.is_pro}
              priority
              style={accentColor ? { borderColor: accentColor } : undefined}
              className="relative z-10 -mt-12 h-24 w-24 shrink-0 rounded-full border-2 border-[var(--surface-raised)] text-3xl sm:-mt-14 sm:h-28 sm:w-28"
            />
            <SharePortfolioButton username={profile.username} displayName={displayName} />
          </div>
          <div className="mt-3">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <h1 className="text-[32px] font-semibold tracking-[-0.025em]">{displayName}</h1>
              <UserBadges isPro={profile.is_pro} isFounder={profile.is_founder} isCampusFounder={profile.is_campus_founder} isVerifiedStudent={profile.verified_student} isBot={profile.is_bot} />
            </div>
            <p className="mt-0.5 text-[15px] text-[var(--ink-muted)]">@{profile.username}</p>
            {metaLine && <p className="mt-2 text-sm text-[var(--ink-muted)]">{metaLine}</p>}
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1">
              <Stat value={Number(counts.posts)} label="posts" accent={Boolean(accentColor)} />
              <Stat value={Number(counts.followers)} label="followers" accent={Boolean(accentColor)} href={`/profile/${profile.username}/followers`} />
              <Stat value={Number(counts.following)} label="following" accent={Boolean(accentColor)} href={`/profile/${profile.username}/following`} />
            </div>
          </div>
        </div>
      </section>

      {profile.is_private ? (
        <div className="card mt-3 px-6 py-8 text-center">
          <p className="font-medium text-[var(--ink)]">This account is private</p>
        </div>
      ) : (
        <Suspense fallback={<PortfolioSectionsFallback />}>
          <PublicPortfolioBelow username={username} profile={profile} client={client} bundlePromise={bundlePromise} />
        </Suspense>
      )}
    </main>
  );
}

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams?: Promise<{ preview?: string }>;
}) {
  const { username } = await params;
  const previewPublic = (await searchParams)?.preview === "public";
  if (!(await hasPortfolioAuthCookie())) return <PublicProfileView username={username} />;

  const supabase = await createClient();
  const [{ data: { user } }, profile] = await Promise.all([
    supabase.auth.getUser(),
    getProfileByUsername(username),
  ]);
  if (!user) return <PublicProfileView username={username} />;
  if (!profile) notFound();

  const isOwner = user.id === profile.id;
  const displayName = profile.display_name ?? profile.username;

  const readClient = await portfolioReadClient(true);
  const [
    schoolRes,
    countRes,
    relRes,
    blockedIdsRes,
    myBlockRes,
    bundle,
    ownerProjects,
    ownerGithub,
    ownerGithubDays,
    ownerExpEdu,
  ] = await Promise.all([
    supabase.from("profile_school").select("school").eq("profile_id", profile.id).maybeSingle(),
    supabase.rpc("get_profile_counts", { p_profile_id: profile.id }),
    user && !isOwner
      ? supabase.from("follows").select("status").eq("follower_id", user.id).eq("following_id", profile.id).maybeSingle()
      : Promise.resolve({ data: null as { status: string } | null }),
    user && !isOwner ? supabase.rpc("get_blocked_ids") : Promise.resolve({ data: [] as string[] }),
    user && !isOwner
      ? supabase.from("blocks").select("id").eq("blocker_id", user.id).eq("blocked_id", profile.id).maybeSingle()
      : Promise.resolve({ data: null as { id: string } | null }),
    loadPublicPortfolioBundle(readClient, username),
    isOwner ? listOwnerProjects(supabase, user.id) : Promise.resolve({ ok: true as const, data: [] }),
    isOwner ? getOwnerGithubConnection(readClient, user.id) : Promise.resolve({ ok: true as const, data: null }),
    isOwner ? getOwnerGithubDays(readClient, user.id) : Promise.resolve({ ok: true as const, data: [] }),
    isOwner && !previewPublic
      ? Promise.all([
          supabase
            .from("experiences")
            .select("id, kind, org, role, term, note, start_date, end_date, is_current")
            .eq("user_id", profile.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("education")
            .select("id, school, degree, field, class_year, start_date, end_date, school_domain, is_current")
            .eq("user_id", profile.id)
            .order("start_date", { ascending: false, nullsFirst: false }),
        ])
      : Promise.resolve(null),
  ]);

  const viewerId = user.id;
  const school = schoolRes.data?.school ?? null;
  const counts = countRes.data?.[0] ?? { posts: 0, followers: 0, following: 0 };
  const isAcceptedFollower = relRes.data?.status === "accepted";

  const isBlocked = !!(blockedIdsRes.data ?? []).includes(profile.id);
  const amIBlocking = !!myBlockRes.data;
  const followState: FollowState =
    relRes.data?.status === "accepted" ? "following" : relRes.data?.status === "pending" ? "pending" : "none";
  const contentHidden = (profile.is_private && !isOwner && !isAcceptedFollower) || isBlocked;
  const portfolioUnavailable = !bundle.ok && Boolean(bundle.unavailable);
  const projection = bundle.ok ? bundle.data.projection : null;
  const usePublicSections = !isOwner || previewPublic;

  let experience: PublicPortfolioExperience[] = [];
  let education: Array<PublicPortfolioEducation & { school_domain?: string | null }> = [];
  if (usePublicSections && bundle.ok) {
    experience = bundle.data.sections.experience;
    education = bundle.data.sections.education;
  } else if (ownerExpEdu) {
    const [expRes, eduRes] = ownerExpEdu;
    experience = (expRes.data ?? []).map((row) => ({
      id: row.id,
      kind: row.kind,
      org: row.org,
      role: row.role,
      term: row.term,
      note: row.note,
      start_date: row.start_date,
      end_date: row.end_date,
      is_current: row.is_current,
    }));
    education = (eduRes.data ?? []).map((row) => ({
      id: row.id,
      school: row.school,
      degree: row.degree,
      field: row.field,
      class_year: row.class_year,
      start_date: row.start_date,
      end_date: row.end_date,
      is_current: row.is_current,
      school_domain: row.school_domain,
    }));
  }

  const logoNames = [...new Set(experience.map((e) => e.org))];
  const logoByName = new Map<string, string | null>();
  if (logoNames.length > 0) {
    const { data: companies } = await supabase.from("job_companies").select("name, logo_url").in("name", logoNames);
    for (const c of companies ?? []) logoByName.set(c.name.trim().toLowerCase(), c.logo_url);
  }

  function currentNewestFirst<T extends { start_date: string | null; is_current: boolean }>(rows: T[]): T[] {
    return rows.filter((r) => r.is_current).sort((a, b) => (b.start_date ?? "").localeCompare(a.start_date ?? ""));
  }
  const currentExp = currentNewestFirst(experience)[0] ?? null;
  const currentEdu = pickPrimaryEducation(currentNewestFirst(education)) ?? null;
  const expPhrase = currentExp ? `${currentExp.role} at ${currentExp.org}` : null;
  const eduPhrase = currentEdu
    ? currentEdu.field
      ? `${currentEdu.field} at ${currentEdu.school}`
      : currentEdu.degree
        ? `${currentEdu.degree} at ${currentEdu.school}`
        : currentEdu.school
    : null;
  const expEduTagline = [expPhrase, eduPhrase].filter(Boolean).join(" · ");
  const canCiteExpEdu =
    !contentHidden &&
    (isOwner && !previewPublic
      ? true
      : Boolean(
          projection &&
            !projection.is_private &&
            (publicSectionVisible(projection, "experience") || publicSectionVisible(projection, "education"))
        ));
  const tagline = canCiteExpEdu ? expEduTagline : "";
  const metaParts = [school, profile.major].filter(Boolean);
  const fallbackMetaLine =
    metaParts.length <= 1 ? metaParts[0] ?? null : `${metaParts[0]} · ${metaParts.slice(1).join(", ")}`;
  const metaLine = tagline || fallbackMetaLine;

  const pro = isPro(profile);
  const bannerUrl = pro ? profile.banner_url : null;
  const theme = pro && isProfileTheme(profile.profile_theme) ? profile.profile_theme : null;
  const accentColor = theme ? PROFILE_THEMES[theme].accent : null;
  const themeVars = themeCssVars(theme);

  const intro = profileIntro(
    {
      id: profile.id,
      username: profile.username,
      display_name: profile.display_name,
      bio: profile.bio,
      goals: profile.goals,
      open_to: "open_to" in profile && Array.isArray(profile.open_to) ? profile.open_to : [],
      is_private: profile.is_private,
    },
    projection,
    isOwner && !previewPublic ? "owner" : "public"
  );

  const canReadHeatmap = isOwner || isAcceptedFollower || profile.heatmap_visibility === "public";
  const publicSamehere = bundle.ok ? bundle.data.samehere : [];
  const publicSamehereKnown = bundle.ok ? bundle.data.samehereKnown : false;
  const github = usePublicSections && bundle.ok ? bundle.data.github : ownerGithubDays.ok ? ownerGithubDays.data : [];
  const connection = isOwner && !previewPublic && ownerGithub.ok ? ownerGithub.data : null;

  const showPosts = isOwner
    ? !previewPublic || (projection?.publish_posts ?? false) || (profile.is_private && isAcceptedFollower)
    : profile.is_private
      ? isAcceptedFollower && !isBlocked
      : !isBlocked && (portfolioUnavailable || (projection?.publish_posts ?? false) || !bundle.ok);

  const activitySection = (
    <Suspense fallback={<HeatmapSkeleton />}>
      <ProfileActivityBlock
        profileId={profile.id}
        canReadHeatmap={canReadHeatmap}
        previewPublic={previewPublic && isOwner}
        publicSamehere={publicSamehere}
        publicSamehereKnown={publicSamehereKnown}
        github={github}
        connection={connection}
        isOwner={isOwner && !previewPublic}
      />
    </Suspense>
  );
  const postsSection = showPosts ? (
    <Suspense fallback={<ProfilePostsSkeleton />}>
      <ProfileRecentPosts
        profileId={profile.id}
        username={profile.username}
        viewerId={viewerId}
        isOwner={isOwner}
        isBlocked={isBlocked}
        contentHidden={contentHidden}
      />
    </Suspense>
  ) : null;

  return (
    <main
      className={`page-enter mx-auto max-w-2xl px-4 py-6 sm:px-5 sm:py-8${theme ? " profile-themed" : ""}`}
      style={themeVars}
    >
      <div className="theme-zone">
        {isOwner && <OwnerBar username={profile.username} previewPublic={previewPublic} />}
        {isOwner && !previewPublic && (
          <Suspense fallback={<PortfolioAnalyticsFallback />}>
            <OwnerAnalyticsSection
              client={supabase}
              ownerId={profile.id}
              currentPro={pro}
              titles={new Map((ownerProjects.ok ? ownerProjects.data : []).map((project) => [project.id, project.title]))}
            />
          </Suspense>
        )}
        {!isOwner &&
          eligiblePublicView({
            isOwner: false,
            previewPublic: false,
            isPrivate: contentHidden,
            isBlocked,
            isSuspended: false,
            hasRenderedPublicContent: Boolean(
              projection && PORTFOLIO_SECTIONS.some((section) => publicSectionVisible(projection, section))
            ),
          }) && <TrackPortfolioView username={profile.username} />}
        <section className="card-raised portfolio-enter-header overflow-hidden">
          <PortfolioBanner username={profile.username} src={bannerUrl} accent={accentColor} />
          <div className="px-5 pb-5 sm:px-6 sm:pb-6">
            <div className="flex flex-col gap-3 min-[391px]:flex-row min-[391px]:items-end min-[391px]:justify-between">
              <AvatarBase
                src={profile.avatar_url}
                seed={profile.username}
                name={displayName}
                pro={pro}
                style={accentColor ? { borderColor: accentColor } : undefined}
                className="relative z-10 -mt-12 h-24 w-24 shrink-0 rounded-full border-2 border-[var(--surface-raised)] text-3xl sm:-mt-14 sm:h-28 sm:w-28"
              />
              {isOwner ? (
                <SharePortfolioButton username={profile.username} displayName={displayName} />
              ) : (
                <div className="flex w-full shrink-0 flex-col items-stretch gap-2 min-[391px]:w-auto min-[391px]:items-end">
                  <ProfileActions
                    username={profile.username}
                    targetId={profile.id}
                    viewerId={user.id}
                    followState={followState}
                    blocked={isBlocked}
                    amIBlocking={amIBlocking}
                  />
                  <SharePortfolioButton username={profile.username} displayName={displayName} />
                </div>
              )}
            </div>
            <div className="mt-3">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <h1 className="text-[32px] font-semibold tracking-[-0.025em]">{displayName}</h1>
                <UserBadges isPro={profile.is_pro} isFounder={profile.is_founder} isCampusFounder={profile.is_campus_founder} isVerifiedStudent={profile.verified_student} isBot={profile.is_bot} />
              </div>
              <p className="mt-0.5 text-[15px] text-[var(--ink-muted)]">@{profile.username}</p>
              {metaLine && <p className="mt-2 text-sm text-[var(--ink-muted)]">{metaLine}</p>}
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1">
                <Stat value={Number(counts.posts)} label="posts" accent={!!theme} />
                <Stat value={Number(counts.followers)} label="followers" accent={!!theme} href={`/profile/${profile.username}/followers`} />
                <Stat value={Number(counts.following)} label="following" accent={!!theme} href={`/profile/${profile.username}/following`} />
              </div>
            </div>
          </div>
        </section>

        {portfolioUnavailable && isOwner && (
          <>
            <UnavailableNotice />
            {!previewPublic && (
              <IntroSection bio={intro.bio} goals={intro.goals} openTo={intro.open_to} />
            )}
            {canReadHeatmap && (
              <div className="mt-4">
                <Suspense fallback={<HeatmapSkeleton />}>
                  <ProfileActivitySection profileId={profile.id} isOwner={isOwner} />
                </Suspense>
              </div>
            )}
            <ExperienceList items={experience} logos={logoByName} />
            <EducationList items={education} />
            {postsSection}
          </>
        )}
        {portfolioUnavailable && !isOwner && (
          <>
            {!contentHidden && canReadHeatmap && (
              <div className="mt-4">
                <Suspense fallback={<HeatmapSkeleton />}>
                  <ProfileActivitySection profileId={profile.id} isOwner={false} />
                </Suspense>
              </div>
            )}
            {postsSection}
          </>
        )}
        {!portfolioUnavailable && (
          <PortfolioBody
            projection={projection}
            unavailable={false}
            isOwner={isOwner}
            previewPublic={previewPublic && isOwner}
            ownerProjects={ownerProjects.ok ? ownerProjects.data : []}
            publicProjects={bundle.ok ? bundle.data.sections.projects : []}
            experience={experience}
            education={education}
            logos={logoByName}
            activity={activitySection}
            currentPro={isOwner ? pro : Boolean(profile.is_pro)}
            intro={intro}
            posts={postsSection}
          />
        )}

        {!isOwner && user && (!isBlocked || amIBlocking) && (
          <div className="mt-3 flex justify-end">
            <BlockButton targetId={profile.id} initialBlocked={amIBlocking} />
          </div>
        )}
      </div>
    </main>
  );
}
