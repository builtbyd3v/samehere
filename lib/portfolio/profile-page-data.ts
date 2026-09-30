import type { createClient } from "@/lib/supabase/server";
import type {
  PortfolioSection,
  PublicPortfolioEducation,
  PublicPortfolioExperience,
  PublicPortfolioProjection,
} from "@/types/portfolio";
import { pickPrimaryEducation } from "@/lib/education-options";
import { isPro } from "@/lib/pro";
import { PROFILE_THEMES, isProfileTheme, themeCssVars } from "@/lib/themes";
import type { FollowState } from "@/components/profile/FollowButton";
import type { PortfolioClient } from "./client";
import { getOwnerGithubConnection, getOwnerGithubDays, loadPublicPortfolioBundle } from "./public";
import { listOwnerProjects } from "./owner";
import { effectiveSectionOrder } from "./metrics";
import { profileIntro, publicSectionVisible } from "./projection";

export const RESUME_DISPLAY_ORDER = ["intro", "projects", "experience", "education", "activity", "posts"] as const satisfies readonly PortfolioSection[];

/** Display order only. Non-Pro portfolios read as a resume; Pro custom orders still win. The stored order and the DB default never change. */
export function displaySectionOrder(saved: readonly string[] | null | undefined, currentPro: boolean): PortfolioSection[] {
  return currentPro ? effectiveSectionOrder(saved, true) : [...RESUME_DISPLAY_ORDER];
}

type ServerClient =Awaited<ReturnType<typeof createClient>>;
type EducationRow = PublicPortfolioEducation & { school_domain?: string | null };

const PROFILE_SELECT =
  "id, username, display_name, avatar_url, banner_url, year, major, bio, goals, open_to, study_mode, is_private, heatmap_visibility, is_pro, pro_until, is_founder, is_campus_founder, profile_theme, verified_student, is_bot, headline, github_url, linkedin_url, website_url, stage, focus_areas";
const PROFILE_SELECT_FALLBACK =
  "id, username, display_name, avatar_url, banner_url, year, major, bio, goals, is_private, heatmap_visibility, is_pro, pro_until, is_founder, is_campus_founder, profile_theme, verified_student, is_bot";

export async function fetchProfileByUsername(supabase: ServerClient, username: string) {
  const first = await supabase.from("profiles").select(PROFILE_SELECT).eq("username", username).maybeSingle();
  if (!first.error) return first.data;
  const fallback = await supabase.from("profiles").select(PROFILE_SELECT_FALLBACK).eq("username", username).maybeSingle();
  return fallback.data;
}

type ViewerProfile = NonNullable<Awaited<ReturnType<typeof fetchProfileByUsername>>>;

/** "School · Major", or just the school. Null without a school (the row is labeled School). */
export function schoolMajorLine(school: string | null, major: string | null): string | null {
  if (!school) return null;
  return major ? `${school} · ${major}` : school;
}

function currentNewestFirst<T extends { start_date: string | null; is_current: boolean }>(rows: T[]): T[] {
  return rows.filter((r) => r.is_current).sort((a, b) => (b.start_date ?? "").localeCompare(a.start_date ?? ""));
}

/** "Role at Org · Field at School" from the current rows, "" when none. */
export function currentExpEduTagline(experience: PublicPortfolioExperience[], education: EducationRow[]): string {
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
  return [expPhrase, eduPhrase].filter(Boolean).join(" · ");
}

export function canCiteExpEdu({
  contentHidden,
  isOwner,
  previewPublic,
  projection,
}: {
  contentHidden: boolean;
  isOwner: boolean;
  previewPublic: boolean;
  projection: PublicPortfolioProjection | null;
}): boolean {
  return (
    !contentHidden &&
    (isOwner && !previewPublic
      ? true
      : Boolean(
          projection &&
            !projection.is_private &&
            (publicSectionVisible(projection, "experience") || publicSectionVisible(projection, "education"))
        ))
  );
}

type OwnerExperienceRow = {
  id: string;
  kind: string;
  org: string;
  role: string;
  term: string | null;
  note: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
};

type OwnerEducationRow = {
  id: string;
  school: string;
  degree: string | null;
  field: string | null;
  class_year: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  school_domain: string | null;
};

export function mapOwnerExperienceRows(rows: OwnerExperienceRow[] | null): PublicPortfolioExperience[] {
  return (rows ?? []).map((row) => ({
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
}

export function mapOwnerEducationRows(rows: OwnerEducationRow[] | null): EducationRow[] {
  return (rows ?? []).map((row) => ({
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

const resumeText = (value: unknown) => (typeof value === "string" ? value : null);

/**
 * Mirrors get_public_profile: hidden from viewers who cannot see content,
 * and from the owner's public preview of a private account.
 * The fallback select has no resume columns, so narrow each one.
 */
export function resumeFields({
  profile,
  contentHidden,
  isOwner,
  previewPublic,
}: {
  profile: { is_private: boolean };
  contentHidden: boolean;
  isOwner: boolean;
  previewPublic: boolean;
}) {
  return !contentHidden && !(isOwner && previewPublic && profile.is_private) && "headline" in profile
    ? {
        headline: resumeText(profile.headline),
        github: "github_url" in profile ? resumeText(profile.github_url) : null,
        linkedin: "linkedin_url" in profile ? resumeText(profile.linkedin_url) : null,
        website: "website_url" in profile ? resumeText(profile.website_url) : null,
      }
    : null;
}

export function resolveShowPosts({
  isOwner,
  previewPublic,
  isPrivate,
  isAcceptedFollower,
  isBlocked,
  portfolioUnavailable,
  projection,
  bundleOk,
}: {
  isOwner: boolean;
  previewPublic: boolean;
  isPrivate: boolean;
  isAcceptedFollower: boolean;
  isBlocked: boolean;
  portfolioUnavailable: boolean;
  projection: PublicPortfolioProjection | null;
  bundleOk: boolean;
}): boolean {
  return isOwner
    ? !previewPublic || (projection?.publish_posts ?? false) || (isPrivate && isAcceptedFollower)
    : isPrivate
      ? isAcceptedFollower && !isBlocked
      : !isBlocked && (portfolioUnavailable || (projection?.publish_posts ?? false) || !bundleOk);
}

/** Intro fields a logged-out visitor may see (gated by `publish_intro`). */
export function publicProfileIntro(
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
  },
  projection: PublicPortfolioProjection | null
) {
  return profileIntro(
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
}

/** Logged-out load. `null` when there is no such public profile. */
export async function loadPublicProfilePage(client: PortfolioClient, username: string) {
  const { data: profileRows } = await client.rpc("get_public_profile", { p_username: username });
  const profile = profileRows?.[0] ?? null;
  if (!profile) return null;

  const countsPromise = client.rpc("get_public_profile_counts", { p_profile_id: profile.id });
  const bundlePromise = loadPublicPortfolioBundle(client, username);
  const { data: countRows } = await countsPromise;
  const counts = countRows?.[0] ?? { posts: 0, followers: 0, following: 0 };
  const displayName = profile.display_name ?? profile.username;
  const schoolLine = schoolMajorLine(profile.school, profile.major);
  const bannerUrl = profile.banner_url;
  const accentColor = profile.accent_color;
  return { profile, counts, bundlePromise, displayName, schoolLine, bannerUrl, accentColor };
}

/** Logged-in load: every value the viewer page renders. */
export async function loadViewerProfilePage({
  supabase,
  readClient,
  userId,
  profile,
  isOwner,
  previewPublic,
}: {
  supabase: ServerClient;
  readClient: PortfolioClient;
  userId: string;
  profile: ViewerProfile;
  isOwner: boolean;
  previewPublic: boolean;
}) {
  const username = profile.username;
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
    !isOwner
      ? supabase.from("follows").select("status").eq("follower_id", userId).eq("following_id", profile.id).maybeSingle()
      : Promise.resolve({ data: null as { status: string } | null }),
    !isOwner ? supabase.rpc("get_blocked_ids") : Promise.resolve({ data: [] as string[] }),
    !isOwner
      ? supabase.from("blocks").select("id").eq("blocker_id", userId).eq("blocked_id", profile.id).maybeSingle()
      : Promise.resolve({ data: null as { id: string } | null }),
    loadPublicPortfolioBundle(readClient, username),
    isOwner ? listOwnerProjects(supabase, userId) : Promise.resolve({ ok: true as const, data: [] }),
    isOwner ? getOwnerGithubConnection(readClient, userId) : Promise.resolve({ ok: true as const, data: null }),
    isOwner ? getOwnerGithubDays(readClient, userId) : Promise.resolve({ ok: true as const, data: [] }),
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

  const school = schoolRes.data?.school ?? null;
  const counts = countRes.data?.[0] ?? { posts: 0, followers: 0, following: 0 };
  const isAcceptedFollower = relRes.data?.status === "accepted";

  const isBlocked = !!(blockedIdsRes.data ?? []).includes(profile.id);
  const amIBlocking = !!myBlockRes.data;
  const followState: FollowState =
    relRes.data?.status === "accepted" ? "following" : relRes.data?.status === "pending" ? "pending" : "none";
  const contentHidden = (profile.is_private && !isOwner && !isAcceptedFollower) || isBlocked;
  const resume = resumeFields({ profile, contentHidden, isOwner, previewPublic });
  const portfolioUnavailable = !bundle.ok && Boolean(bundle.unavailable);
  const projection = bundle.ok ? bundle.data.projection : null;
  const usePublicSections = !isOwner || previewPublic;

  let experience: PublicPortfolioExperience[] = [];
  let education: EducationRow[] = [];
  if (usePublicSections && bundle.ok) {
    experience = bundle.data.sections.experience;
    education = bundle.data.sections.education;
  } else if (ownerExpEdu) {
    const [expRes, eduRes] = ownerExpEdu;
    experience = mapOwnerExperienceRows(expRes.data);
    education = mapOwnerEducationRows(eduRes.data);
  }

  const logoNames = [...new Set(experience.map((e) => e.org))];
  const logoByName = new Map<string, string | null>();
  if (logoNames.length > 0) {
    const { data: companies } = await supabase.from("job_companies").select("name, logo_url").in("name", logoNames);
    for (const c of companies ?? []) logoByName.set(c.name.trim().toLowerCase(), c.logo_url);
  }

  const canCite = canCiteExpEdu({ contentHidden, isOwner, previewPublic, projection });
  const tagline = canCite ? currentExpEduTagline(experience, education) : "";

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
      study_mode: "study_mode" in profile ? (profile.study_mode as string | null) ?? null : null,
      stage: "stage" in profile ? (profile.stage as string | null) ?? null : null,
      focus_areas: "focus_areas" in profile && Array.isArray(profile.focus_areas) ? profile.focus_areas : [],
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

  const showPosts = resolveShowPosts({
    isOwner,
    previewPublic,
    isPrivate: profile.is_private,
    isAcceptedFollower,
    isBlocked,
    portfolioUnavailable,
    projection,
    bundleOk: bundle.ok,
  });

  return {
    counts,
    isAcceptedFollower,
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
    accentColor,
    themeVars,
    intro,
    canReadHeatmap,
    publicSamehere,
    publicSamehereKnown,
    github,
    connection,
    showPosts,
  };
}
