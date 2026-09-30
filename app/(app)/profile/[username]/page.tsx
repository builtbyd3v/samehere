import type { Metadata } from "next";
import Link from "next/link";
import { cache, Suspense, type CSSProperties, type ReactNode } from "react";
import type {
  PortfolioProject,
  PortfolioSection,
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
import { HeatmapSkeleton, PortfolioSectionsFallback, ProfilePostsSkeleton } from "@/components/ui/Skeleton";
import { createAnonPortfolioClient, hasPortfolioAuthCookie, portfolioReadClient, type PortfolioClient } from "@/lib/portfolio/client";
import { loadPublicPortfolioBundle } from "@/lib/portfolio/public";
import {
  displaySectionOrder,
  fetchProfileByUsername,
  loadPublicProfilePage,
  loadViewerProfilePage,
  publicProfileIntro,
  schoolMajorLine,
} from "@/lib/portfolio/profile-page-data";
import { profileShareTitle } from "@/lib/og/copy";
import { hasPublishedSection, metadataDescription, publicSectionVisible, robotsForProjection } from "@/lib/portfolio/projection";
import { eligiblePublicView } from "@/lib/portfolio/metrics";
import TrackPortfolioView from "@/components/portfolio/TrackPortfolioView";
import RefLanding from "@/components/portfolio/RefLanding";
import { OwnerAnalyticsSection, PortfolioAnalyticsFallback } from "@/components/portfolio/PortfolioAnalytics";
import SharePortfolioButton from "@/components/portfolio/SharePortfolioButton";
import ExportPortfolioButton from "@/components/portfolio/ExportPortfolioButton";
import PortfolioBanner from "@/components/portfolio/PortfolioBanner";
import IdentityPanel from "@/components/portfolio/IdentityPanel";
import ProfileSegments, { type ProfileTab } from "@/components/portfolio/ProfileSegments";
import UnavailableNotice from "@/components/portfolio/UnavailableNotice";
import {
  ActivitySection,
  IntroSection,
  OwnerProjects,
  PublicProjectList,
  ResumeTimeline,
} from "@/components/portfolio/ProfileSections";
import { Button } from "@/components/ui/Button";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Reveal } from "@/components/ui/Reveal";
import { parseRef } from "@/lib/referrals";
const getProfileByUsername = cache(async (username: string) => fetchProfileByUsername(await createClient(), username));

const loadViewerPublicMeta = cache(async (username: string, hasAuth: boolean) => {
  const client = await portfolioReadClient(hasAuth);
  const [{ data }, portfolio] = await Promise.all([
    client.rpc("get_public_profile", { p_username: username }),
    loadPublicPortfolioBundle(client, username),
  ]);
  return { profile: data?.[0] ?? null, portfolio };
});

// Phone segments: each section panel hides unless its tab is active (below md only).
const PANEL: Record<ProfileTab, string> = {
  resume: "group-data-[tab=posts]:max-md:hidden group-data-[tab=activity]:max-md:hidden",
  posts: "group-data-[tab=resume]:max-md:hidden group-data-[tab=activity]:max-md:hidden",
  activity: "group-data-[tab=resume]:max-md:hidden group-data-[tab=posts]:max-md:hidden",
};
const tabOf = (section: PortfolioSection): ProfileTab =>
  section === "posts" ? "posts" : section === "activity" ? "activity" : "resume";

/** Stacked right-column sections outside the segmented body. */
const COLUMN = "flex flex-col gap-10 md:gap-12 xl:gap-14";
const PAGE_MAIN = "relative isolate mx-auto w-full max-w-2xl overflow-x-clip py-6 sm:py-8 xl:max-w-[1120px] xl:py-16";

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

function ProfileBackdrop({ bannerUrl, accent }: { bannerUrl: string | null; accent: boolean }) {
  if (!bannerUrl && !accent) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[300px] overflow-hidden mask-b-from-10% mask-x-from-70% xl:h-[420px]">
      {bannerUrl ? (
        <PortfolioBanner src={bannerUrl} />
      ) : (
        // ponytail: local accent tint because LightPool has no tint prop; it is the Pro theme color the owner picked, not decoration.
        <div className="absolute inset-0 bg-[radial-gradient(90%_70%_at_20%_0%,color-mix(in_srgb,var(--profile-accent)_45%,transparent),transparent_70%)] xl:bg-[radial-gradient(45%_80%_at_22%_0%,color-mix(in_srgb,var(--profile-accent)_40%,transparent),transparent_70%)]" />
      )}
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
      <div className={COLUMN}>
        {isOwner && <UnavailableNotice />}
        {isOwner && !previewPublic && (
          <IntroSection
            bio={intro.bio}
            goals={intro.goals}
            studyMode={intro.study_mode}
          />
        )}
        {posts}
      </div>
    );
  }
  const order = displaySectionOrder(projection?.section_order ?? [], currentPro);
  const show = (section: (typeof order)[number]) => {
    if (isOwner && !previewPublic) return true;
    if (!projection) return false;
    return publicSectionVisible(projection, section);
  };
  const tabs: ProfileTab[] = ["resume"];
  if (show("posts") && posts) tabs.push("posts");
  if (show("activity")) tabs.push("activity");
  return (
    <ProfileSegments tabs={tabs}>
      {order.map((section) => {
        let content: ReactNode = null;
        if (section === "intro" && show("intro")) {
          content = (
            <IntroSection
              bio={intro.bio}
              goals={intro.goals}
              studyMode={intro.study_mode}
            />
          );
        } else if (section === "projects" && show("projects")) {
          content = isOwner && !previewPublic ? (
            <OwnerProjects projects={ownerProjects} previewPublic={false} />
          ) : (
            <PublicProjectList projects={publicProjects} />
          );
        } else if (section === "activity" && show("activity")) {
          content = activity;
        } else if (section === "experience" || section === "education") {
          // One timeline at the first of the two; each half keeps its own publish flag.
          if (section !== order.find((s) => s === "experience" || s === "education")) return null;
          content = (
            <ResumeTimeline
              experience={show("experience") ? experience : []}
              education={show("education") ? education : []}
              logos={logos}
            />
          );
        } else if (section === "posts" && show("posts")) {
          content = posts;
        }
        if (!content) return null;
        return (
          <div key={section} className={`empty:hidden ${PANEL[tabOf(section)]}`}>
            {content}
          </div>
        );
      })}
    </ProfileSegments>
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
      <SectionLabel as="h2">Activity</SectionLabel>
      <ContributionHeatmap data={heatmap} />
    </section>
  );
}

async function PublicPortfolioBelow({
  username,
  profile,
  intro,
  client,
  bundlePromise,
}: {
  username: string;
  profile: {
    id: string;
    is_private: boolean;
    is_pro: boolean;
    heatmap_visibility: string | null;
  };
  intro: ReturnType<typeof publicProfileIntro>;
  client: PortfolioClient;
  bundlePromise: ReturnType<typeof loadPublicPortfolioBundle>;
}) {
  const bundle = await bundlePromise;
  const projection = bundle.ok ? bundle.data.projection : null;
  const trackView = eligiblePublicView({
    isOwner: false,
    previewPublic: false,
    isPrivate: profile.is_private,
    isBlocked: false,
    isSuspended: false,
    hasRenderedPublicContent: hasPublishedSection(projection),
  });
  const posts = (
    <section>
      <SectionLabel as="h2" className="mb-3">
        Posts
      </SectionLabel>
      <p className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
        Log in to see their posts
        <Button href="/login" variant="ghost" size="sm">
          Log in
        </Button>
        <Button href={`/signup?ref=${encodeURIComponent(username)}`} variant="primary" size="sm">
          Join free
        </Button>
      </p>
    </section>
  );

  return (
    <>
      {trackView && <TrackPortfolioView username={username} />}
      {!bundle.ok && bundle.unavailable ? (
        <div className={COLUMN}>
          {profile.heatmap_visibility === "public" && (
            <Suspense fallback={<HeatmapSkeleton />}>
              <PublicHeatmapFallback client={client} profileId={profile.id} />
            </Suspense>
          )}
          {posts}
        </div>
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

/** The two-column frame shared by both views. */
function ProfileGrid({
  panel,
  notice,
  single,
  children,
}: {
  panel: ReactNode;
  notice?: ReactNode;
  single?: boolean;
  children: ReactNode;
}) {
  if (single) {
    return (
      <div data-profile-grid className="mx-auto flex w-full max-w-[440px] flex-col gap-6">
        <Reveal delay={0}>{panel}</Reveal>
        {notice}
        {children}
      </div>
    );
  }
  return (
    <div
      data-profile-grid
      className="flex flex-col gap-8 xl:grid xl:grid-cols-[300px_minmax(0,1fr)] xl:gap-12 min-[90rem]:grid-cols-[340px_minmax(0,1fr)] min-[90rem]:gap-[72px]"
    >
      {/* ponytail: the panel is sticky only on viewports at least 880px tall, so the counts are never cut off on short laptops. */}
      <aside className="xl:self-start xl:[@media(min-height:880px)]:sticky xl:[@media(min-height:880px)]:top-24">
        <Reveal delay={0}>{panel}</Reveal>
        {notice}
      </aside>
      {/* ponytail: one reveal for the whole column (a per-panel reveal would replay on every segment tap); add a CSS-only stagger later if wanted. */}
      <div className="min-w-0 xl:pt-2">
        <Reveal delay={80}>{children}</Reveal>
      </div>
    </div>
  );
}

function NothingPublished({ owner, username, isPrivate }: { owner: boolean; username: string; isPrivate: boolean }) {
  if (owner) {
    return (
      <p className="text-small text-[var(--muted)]">
        Nothing published yet. Visitors only see this header.{" "}
        <Link href="/profile/edit#publication" className="text-[var(--ink)] underline underline-offset-2">
          Choose what to publish
        </Link>
      </p>
    );
  }
  return (
    <p className="text-small text-[var(--muted)]">
      {isPrivate ? "This account is private." : `@${username} has not published their portfolio yet.`}
    </p>
  );
}

async function PublicProfileView({ username, landingRef }: { username: string; landingRef: string | null }) {
  const client = createAnonPortfolioClient();
  const data = await loadPublicProfilePage(client, username);
  if (!data) notFound();
  const { profile, counts, bundlePromise, displayName, schoolLine, bannerUrl, accentColor } = data;
  // ponytail: the logged-out header now waits for the portfolio bundle (it already runs in parallel with counts); if logged-out TTFB regresses, stream the table rows behind their own Suspense.
  const bundle = await bundlePromise;
  const intro = publicProfileIntro(profile, bundle.ok ? bundle.data.projection : null);
  const nothingPublished = !profile.is_private && bundle.ok && !hasPublishedSection(bundle.data.projection);

  return (
    <main
      data-profile-page
      className={PAGE_MAIN}
      style={accentColor ? ({ "--profile-accent": accentColor } as CSSProperties) : undefined}
    >
      {landingRef && <RefLanding refCode={landingRef} />}
      <ProfileBackdrop bannerUrl={bannerUrl} accent={Boolean(accentColor)} />
      <ProfileGrid
        panel={
          <IdentityPanel
            username={profile.username}
            displayName={displayName}
            avatarUrl={profile.avatar_url}
            pro={profile.is_pro}
            priority
            badges={{
              isPro: profile.is_pro,
              isFounder: profile.is_founder,
              isCampusFounder: profile.is_campus_founder,
              isVerifiedStudent: profile.verified_student,
              isBot: profile.is_bot,
            }}
            headline={profile.headline}
            tagline={null}
            stage={intro.stage}
            focusAreas={intro.focus_areas}
            schoolLine={schoolLine}
            openTo={intro.open_to}
            inviteDm
            links={{ github: profile.github_url, linkedin: profile.linkedin_url, website: profile.website_url }}
            counts={{ posts: Number(counts.posts), followers: Number(counts.followers), following: Number(counts.following) }}
            actions={<SharePortfolioButton username={profile.username} displayName={displayName} />}
          />
        }
        single={nothingPublished}
      >
        {profile.is_private ? (
          <div className="rounded-2xl border border-[var(--hairline)] px-6 py-8 text-center">
            <p className="font-medium text-[var(--ink)]">This account is private</p>
          </div>
        ) : nothingPublished ? (
          <NothingPublished owner={false} username={profile.username} isPrivate={false} />
        ) : (
          <Suspense fallback={<PortfolioSectionsFallback />}>
            <PublicPortfolioBelow
              username={username}
              profile={profile}
              intro={intro}
              client={client}
              bundlePromise={bundlePromise}
            />
          </Suspense>
        )}
      </ProfileGrid>
      {/* Matches the single 440px column when nothing is published, otherwise spans both columns. */}
      <div
        className={`mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--hairline)] pt-6${nothingPublished ? " mx-auto w-full max-w-[440px]" : ""}`}
      >
        <p className="text-small text-[var(--muted)]">This portfolio is built on samehere. Free for CS students.</p>
        <Button href={`/signup?ref=${encodeURIComponent(profile.username)}`} variant="secondary" size="sm">
          Make yours
        </Button>
      </div>
    </main>
  );
}

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams?: Promise<{ preview?: string; ref?: string | string[] }>;
}) {
  const { username } = await params;
  const sp = await searchParams;
  const previewPublic = sp?.preview === "public";
  const landingRef = parseRef(sp?.ref);
  if (!(await hasPortfolioAuthCookie())) return <PublicProfileView username={username} landingRef={landingRef} />;

  const supabase = await createClient();
  const [{ data: { user } }, profile] = await Promise.all([
    supabase.auth.getUser(),
    getProfileByUsername(username),
  ]);
  if (!user) return <PublicProfileView username={username} landingRef={landingRef} />;
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
    school,
    tagline,
    pro,
    bannerUrl,
    theme,
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

  const ownerActions = (
    <div className="grid w-full grid-cols-2 gap-2">
      <Button href="/profile/edit" variant="primary" size="md" shape="rounded" className="col-span-2">
        Edit profile
      </Button>
      <Button href="/profile/projects/new" variant="secondary" size="md" shape="rounded">
        Add project
      </Button>
      <Button href={`/profile/${profile.username}?preview=public`} variant="secondary" size="md" shape="rounded">
        Public preview
      </Button>
      <SharePortfolioButton username={profile.username} displayName={displayName} shape="rounded" fullWidth />
      {/* plan 007: owner-only export */}
      <ExportPortfolioButton username={profile.username} fullWidth />
    </div>
  );
  // Public preview shows what a signed-in visitor sees. Follow and Message are inert here.
  const previewActions = (
    <>
      <div className="flex w-full items-center gap-2">
        <Button variant="primary" size="md" className="flex-1" disabled>
          Follow
        </Button>
        <Button variant="secondary" size="md" className="flex-1" disabled>
          Message
        </Button>
      </div>
      <SharePortfolioButton username={profile.username} displayName={displayName} />
    </>
  );
  const nothingPublished =
    !portfolioUnavailable && (!isOwner || previewPublic) && !postsSection && !hasPublishedSection(projection);
  const actions = isOwner ? (previewPublic ? previewActions : ownerActions) : (
    <>
      <div className="w-full">
        <ProfileActions
          username={profile.username}
          targetId={profile.id}
          viewerId={user.id}
          followState={followState}
          blocked={isBlocked}
          amIBlocking={amIBlocking}
        />
      </div>
      <SharePortfolioButton username={profile.username} displayName={displayName} />
    </>
  );

  return (
    <main
      data-profile-page
      className={`${PAGE_MAIN}${theme ? " profile-themed" : ""}`}
      style={themeVars}
    >
      <ProfileBackdrop bannerUrl={bannerUrl} accent={Boolean(theme)} />
      <div className="theme-zone">
        {!isOwner &&
          eligiblePublicView({
            isOwner: false,
            previewPublic: false,
            isPrivate: contentHidden,
            isBlocked,
            isSuspended: false,
            hasRenderedPublicContent: hasPublishedSection(projection),
          }) && <TrackPortfolioView username={profile.username} />}
        {isOwner && previewPublic && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] px-4 py-3">
            <p className="text-small text-[var(--muted)]">You are previewing your portfolio as a visitor sees it.</p>
            <Button href={`/profile/${profile.username}`} variant="secondary" size="sm" shape="rounded">
              Back to owner view
            </Button>
          </div>
        )}
        <ProfileGrid
          panel={
            <IdentityPanel
              username={profile.username}
              displayName={displayName}
              avatarUrl={profile.avatar_url}
              pro={pro}
              badges={{
                isPro: profile.is_pro,
                isFounder: profile.is_founder,
                isCampusFounder: profile.is_campus_founder,
                isVerifiedStudent: profile.verified_student,
                isBot: profile.is_bot,
              }}
              headline={resume?.headline ?? null}
              tagline={tagline || null}
              stage={intro.stage}
              focusAreas={intro.focus_areas}
              schoolLine={schoolMajorLine(school, profile.major)}
              openTo={intro.open_to}
              inviteDm={!isOwner || previewPublic}
              links={resume ? { github: resume.github, linkedin: resume.linkedin, website: resume.website } : null}
              counts={{ posts: Number(counts.posts), followers: Number(counts.followers), following: Number(counts.following) }}
              actions={actions}
            />
          }
          single={nothingPublished}
          notice={
            isOwner &&
            !previewPublic &&
            projection &&
            !projection.is_private &&
            !hasPublishedSection(projection) && (
              <div className="mt-4">
                <NothingPublished owner username={profile.username} isPrivate={false} />
              </div>
            )
          }
        >
          {nothingPublished && (
            <NothingPublished owner={isOwner} username={profile.username} isPrivate={contentHidden} />
          )}
          {portfolioUnavailable && isOwner && (
            <div className={COLUMN}>
              <UnavailableNotice />
              {!previewPublic && (
                <IntroSection
                  bio={intro.bio}
                  goals={intro.goals}
                  studyMode={intro.study_mode}
                />
              )}
              {canReadHeatmap && (
                <Suspense fallback={<HeatmapSkeleton />}>
                  <ProfileActivitySection profileId={profile.id} isOwner={isOwner} />
                </Suspense>
              )}
              <ResumeTimeline experience={experience} education={education} logos={logoByName} />
              {postsSection}
            </div>
          )}
          {portfolioUnavailable && !isOwner && (
            <div className={COLUMN}>
              {!contentHidden && canReadHeatmap && (
                <Suspense fallback={<HeatmapSkeleton />}>
                  <ProfileActivitySection profileId={profile.id} isOwner={false} />
                </Suspense>
              )}
              {postsSection}
            </div>
          )}
          {!portfolioUnavailable && !nothingPublished && (
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
          {isOwner && !previewPublic && (
            <Suspense fallback={pro ? <PortfolioAnalyticsFallback /> : null}>
              <OwnerAnalyticsSection
                client={supabase}
                ownerId={profile.id}
                currentPro={pro}
                titles={new Map((ownerProjects.ok ? ownerProjects.data : []).map((project) => [project.id, project.title]))}
              />
            </Suspense>
          )}
        </ProfileGrid>

        {!isOwner && user && (!isBlocked || amIBlocking) && (
          <div className="mt-3 flex justify-end">
            <BlockButton targetId={profile.id} initialBlocked={amIBlocking} />
          </div>
        )}
      </div>
    </main>
  );
}
