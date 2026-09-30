import type { Database } from "@/types/database.types";
import type { PublicPortfolioProject } from "@/types/portfolio";
import { loadPublicPortfolioBundle, type PublicReader } from "@/lib/portfolio/public";
import { publicProfileIntro, schoolMajorLine } from "@/lib/portfolio/profile-page-data";

/** Real public accounts shown on the landing. Approved by the maintainer (plan 022). */
export const LANDING_EXAMPLE_USERNAMES = ["dev", "ara"] as const;

type PublicProfileRow = Database["public"]["Functions"]["get_public_profile"]["Returns"][number];
type Bundle = Awaited<ReturnType<typeof loadPublicPortfolioBundle>>;

export type LandingExample = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  badges: { isPro: boolean; isFounder: boolean; isCampusFounder: boolean; isVerifiedStudent: boolean; isBot: boolean };
  headline: string | null;
  stage: string | null;
  focusAreas: string[];
  schoolLine: string | null;
  openTo: string[];
  links: { github: string | null; linkedin: string | null; website: string | null };
  project: PublicPortfolioProject;
};

/**
 * Same fields the logged-out portfolio shows, nothing more. Hidden (null) when the
 * account is missing, private, a bot, or has no published project. get_public_portfolio_projects
 * already returns nothing for private or suspended owners.
 */
export function toLandingExample(profile: PublicProfileRow | null, bundle: Bundle): LandingExample | null {
  if (!profile || profile.is_private || profile.is_bot) return null;
  if (!bundle.ok || !bundle.data.projection) return null;
  const project = bundle.data.sections.projects[0];
  if (!project) return null;
  const intro = publicProfileIntro(profile, bundle.data.projection);
  return {
    username: profile.username,
    displayName: profile.display_name ?? profile.username,
    avatarUrl: profile.avatar_url,
    badges: {
      isPro: profile.is_pro,
      isFounder: profile.is_founder,
      isCampusFounder: profile.is_campus_founder,
      isVerifiedStudent: profile.verified_student,
      isBot: profile.is_bot,
    },
    headline: profile.headline,
    stage: intro.stage,
    focusAreas: intro.focus_areas,
    schoolLine: schoolMajorLine(profile.school, profile.major),
    openTo: intro.open_to,
    links: { github: profile.github_url, linkedin: profile.linkedin_url, website: profile.website_url },
    project,
  };
}

export async function loadLandingExamples(client: PublicReader): Promise<LandingExample[]> {
  try {
    const found = await Promise.all(
      LANDING_EXAMPLE_USERNAMES.map(async (username) => {
        const [{ data }, bundle] = await Promise.all([
          client.rpc("get_public_profile", { p_username: username }),
          loadPublicPortfolioBundle(client, username),
        ]);
        return toLandingExample(data?.[0] ?? null, bundle);
      }),
    );
    return found.filter((e): e is LandingExample => e !== null);
  } catch {
    // ponytail: any fetch failure (CI placeholder env, Supabase down) renders the landing without examples; the next ISR pass (5 min) retries.
    return [];
  }
}
