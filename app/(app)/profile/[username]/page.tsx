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
import ProfileActions from "@/components/profile/ProfileActions";
import BlockButton from "@/components/profile/BlockButton";
import ProfileActivitySection from "@/components/profile/ProfileActivitySection";
import ProfileActivityBlock from "@/components/profile/ProfileActivityBlock";
import ProfileRecentPosts from "@/components/profile/ProfileRecentPosts";
import ContributionHeatmap, { type HeatmapDay } from "@/components/profile/ContributionHeatmap";
import UserBadges from "@/components/profile/UserBadges";
import AvatarBase from "@/components/ui/Avatar";
import { HeatmapSkeleton, PortfolioSectionsFallback, ProfilePostsSkeleton } from "@/components/ui/Skeleton";
import { createAnonPortfolioClient, hasPortfolioAuthCookie, portfolioReadClient, type PortfolioClient } from "@/lib/portfolio/client";
import { loadPublicPortfolioBundle } from "@/lib/portfolio/public";
import { fetchProfileByUsername, loadPublicProfilePage, loadViewerProfilePage } from "@/lib/portfolio/profile-page-data";
import { profileShareTitle } from "@/lib/og/copy";
import { metadataDescription, profileIntro, publicSectionVisible, robotsForProjection } from "@/lib/portfolio/projection";
import { effectiveSectionOrder, eligiblePublicView } from "@/lib/portfolio/metrics";
import { PORTFOLIO_SECTIONS } from "@/lib/portfolio/validation";
import TrackPortfolioView from "@/components/portfolio/TrackPortfolioView";
import { OwnerAnalyticsSection, PortfolioAnalyticsFallback } from "@/components/portfolio/PortfolioAnalytics";
import SharePortfolioButton from "@/components/portfolio/SharePortfolioButton";
import ExportPortfolioButton from "@/components/portfolio/ExportPortfolioButton";
import PortfolioBanner from "@/components/portfolio/PortfolioBanner";
import ResumeLinks from "@/components/portfolio/ResumeLinks";
import UnavailableNotice from "@/components/portfolio/UnavailableNotice";
import {
  ActivitySection,
  IntroSection,
  OwnerProjects,
  PublicProjectList,
  ResumeTimeline,
} from "@/components/portfolio/ProfileSections";
import { Button } from "@/components/ui/Button";
import { MonoLabel } from "@/components/ui/MonoLabel";
const getProfileByUsername = cache(async (username: string) => fetchProfileByUsername(await createClient(), username));

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
  const shareTitle = profileShareTitle(name);
  return {
    title: `${name} (@${username})`,
    description,
    robots,
    openGraph: { title: shareTitle, description, type: "profile" },
    twitter: { card: "summary_large_image", title: shareTitle, description },
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
  intro: {
    bio: string | null;
    goals: string | null;
    open_to: string[];
    study_mode: string | null;
    stage: string | null;
    focus_areas: string[];
  };
}) {
  if (unavailable) {
    return (
      <>
        {isOwner && <UnavailableNotice />}
        {isOwner && !previewPublic && (
          <IntroSection
            bio={intro.bio}
            goals={intro.goals}
            studyMode={intro.study_mode}
          />
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
          return (
            <IntroSection
              key="intro"
              bio={intro.bio}
              goals={intro.goals}
              studyMode={intro.study_mode}
            />
          );
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
        if (section === "experience" || section === "education") {
          // One timeline at the first of the two; each half keeps its own publish flag.
          if (section !== order.find((s) => s === "experience" || s === "education")) return null;
          return (
            <ResumeTimeline
              key="timeline"
              experience={show("experience") ? experience : []}
              education={show("education") ? education : []}
              logos={logos}
            />
          );
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
    <section className="flex flex-col gap-3.5">
      <MonoLabel as="h2">Activity</MonoLabel>
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
    study_mode?: string | null;
    stage?: string | null;
    focus_areas?: string[] | null;
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
      study_mode: "study_mode" in profile ? profile.study_mode ?? null : null,
      stage: profile.stage ?? null,
      focus_areas: profile.focus_areas ?? null,
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
      <MonoLabel as="h2" className="mb-3">
        Posts
      </MonoLabel>
      <p className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
        Sign in to see their posts
        <Button href="/login" variant="ghost" size="sm">
          Sign in
        </Button>
        <Button href="/signup" variant="primary" size="sm">
          Sign up
        </Button>
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
  const data = await loadPublicProfilePage(client, username);
  if (!data) notFound();
  const { profile, counts, bundlePromise, displayName, schoolLine: metaLine, bannerUrl, accentColor } = data;

  return (
    <main
      className="page-enter mx-auto max-w-2xl px-4 py-6 sm:px-5 sm:py-8"
      style={accentColor ? ({ "--profile-accent": accentColor } as CSSProperties) : undefined}
    >
      <section className="card-raised portfolio-enter-header overflow-hidden">
        {bannerUrl ? <PortfolioBanner src={bannerUrl} /> : null}
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
            {profile.headline && <p className="mt-2 text-[15px] text-[var(--ink)]">{profile.headline}</p>}
            {metaLine && <p className="mt-2 text-sm text-[var(--ink-muted)]">{metaLine}</p>}
            <ResumeLinks github={profile.github_url} linkedin={profile.linkedin_url} website={profile.website_url} />
            <div className="profile-stat-enter mt-4 flex flex-wrap gap-x-6 gap-y-1">
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
  const {
    counts,
    isBlocked,
    amIBlocking,
    followState,
    contentHidden,
    resume,
    portfolioUnavailable,
    projection,
    bundle,
    ownerProjects,
    experience,
    education,
    logoByName,
    metaLine,
    pro,
    bannerUrl,
    theme,
    accentColor,
    themeVars,
    intro,
    canReadHeatmap,
    publicSamehere,
    publicSamehereKnown,
    github,
    connection,
    showPosts,
  } = await loadViewerProfilePage({ supabase, readClient, userId: user.id, profile, isOwner, previewPublic });
  const viewerId = user.id;

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
          {bannerUrl ? <PortfolioBanner src={bannerUrl} /> : null}
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
                <div className="flex items-center gap-2">
                  <SharePortfolioButton username={profile.username} displayName={displayName} />
                  <ExportPortfolioButton username={profile.username} />
                </div>
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
              {resume?.headline && <p className="mt-2 text-[15px] text-[var(--ink)]">{resume.headline}</p>}
              {metaLine && <p className="mt-2 text-sm text-[var(--ink-muted)]">{metaLine}</p>}
              {resume && <ResumeLinks github={resume.github} linkedin={resume.linkedin} website={resume.website} />}
              <div className="profile-stat-enter mt-4 flex flex-wrap gap-x-6 gap-y-1">
                <Stat value={Number(counts.posts)} label="posts" accent={!!theme} />
                <Stat value={Number(counts.followers)} label="followers" accent={!!theme} href={`/profile/${profile.username}/followers`} />
                <Stat value={Number(counts.following)} label="following" accent={!!theme} href={`/profile/${profile.username}/following`} />
              </div>
            </div>
          </div>
        </section>

        {isOwner &&
          !previewPublic &&
          projection &&
          !projection.is_private &&
          !PORTFOLIO_SECTIONS.some((section) => publicSectionVisible(projection, section)) && (
            <p className="mt-3 text-sm text-[var(--ink-muted)]">
              Your shared link shows almost nothing.{" "}
              <Link href="/profile/edit#publication" className="text-[var(--ink)] underline underline-offset-2">
                Publish your portfolio
              </Link>
            </p>
          )}

        {portfolioUnavailable && isOwner && (
          <>
            <UnavailableNotice />
            {!previewPublic && (
              <IntroSection
                bio={intro.bio}
                goals={intro.goals}
                studyMode={intro.study_mode}
              />
            )}
            {canReadHeatmap && (
              <div className="mt-4">
                <Suspense fallback={<HeatmapSkeleton />}>
                  <ProfileActivitySection profileId={profile.id} isOwner={isOwner} />
                </Suspense>
              </div>
            )}
            <ResumeTimeline experience={experience} education={education} logos={logoByName} />
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
