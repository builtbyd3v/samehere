import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { cache } from "react";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { cookies } from "next/headers";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { FollowState } from "@/components/profile/FollowButton";
import ProfileActions from "@/components/profile/ProfileActions";
import BlockButton from "@/components/profile/BlockButton";
import DossierProof from "@/components/profile/DossierProof";
import UserBadges from "@/components/profile/UserBadges";
import AvatarBase from "@/components/ui/Avatar";
import { isPro } from "@/lib/pro";
import { PROFILE_THEMES, isProfileTheme, themeCssVars } from "@/lib/themes";
import { pickPrimaryEducation } from "@/lib/education-options";
import { dossierSeekingLine, targetRolesFromAnswers } from "@/lib/profile-dossier";

const PROFILE_SELECT =
  "id, username, display_name, avatar_url, banner_url, year, major, bio, goals, is_private, is_pro, pro_until, is_founder, is_campus_founder, profile_theme, verified_student, is_bot";

// Shared by generateMetadata and the page component so they hit one query
// instead of two — React's cache() dedupes by argument (username) within a
// single render pass. Takes only the primitive username (not a supabase
// client instance) so both call sites land on the same cache entry.
const getProfileByUsername = cache(async (username: string) => {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select(PROFILE_SELECT).eq("username", username).maybeSingle();
  return data;
});

type ExperienceRow = {
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

type EducationRow = {
  id: string;
  school: string;
  degree: string | null;
  field: string | null;
  start_date: string | null;
  end_date: string | null;
  school_domain: string | null;
  is_current: boolean;
};

function currentNewestFirst<T extends { start_date: string | null; is_current: boolean }>(rows: T[]): T[] {
  return rows
    .filter((row) => row.is_current)
    .sort((a, b) => (b.start_date ?? "").localeCompare(a.start_date ?? ""));
}

function schoolMetaLine(school: string | null, major: string | null): string | null {
  const parts = [school, major].filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0] ?? null;
  return `${parts[0]} · ${parts.slice(1).join(", ")}`;
}

// Logged-out render. Uses a plain anon supabase-js client (not the cookie-bound
// session client) so RLS/definer-fn checks run as true anon — same pattern as
// lib/founder.ts. get_public_profile is SECURITY DEFINER + anon-granted and
// enforces privacy itself; this component never re-derives the is_private
// field-nulling rule.
function anonSupabase() {
  return createAnonClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

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
  major: string | null;
  bio: string | null;
  goals: string | null;
  school: string | null;
  verified_student: boolean;
  is_bot: boolean;
};

const getPublicProfileMeta = cache(async (username: string) => {
  const rows = await callRpc<PublicProfile>(anonSupabase(), "get_public_profile", { p_username: username });
  return rows[0] ?? null;
});

async function PublicProfileView({ username }: { username: string }) {
  const profile = (await callRpc<PublicProfile>(anonSupabase(), "get_public_profile", { p_username: username }))[0] ?? null;

  if (!profile) notFound();

  const displayName = profile.display_name ?? profile.username;
  const seeking = dossierSeekingLine({ goals: profile.goals, major: profile.major });
  const metaLine = schoolMetaLine(profile.school, profile.major);

  return (
    <main className="page-enter mx-auto max-w-2xl px-4 py-6 sm:px-5 sm:py-8">
      <section className="card overflow-hidden">
        <div
          aria-hidden
          className="aspect-[4/1] w-full"
          style={{ background: "linear-gradient(120deg, color-mix(in srgb, var(--blue) 14%, var(--surface-card)) 0%, var(--surface-card) 62%)" }}
        />
        <div className="px-5 pb-5 sm:px-6 sm:pb-6">
          <AvatarBase
            src={profile.avatar_url}
            seed={profile.username}
            name={displayName}
            pro={profile.is_pro}
            priority
            className="-mt-12 h-24 w-24 shrink-0 rounded-full border-4 border-[var(--surface-card)] text-3xl sm:-mt-14 sm:h-28 sm:w-28"
          />

          <div className="mt-3">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <h1 className="text-2xl font-semibold tracking-[-0.025em] sm:text-[28px]">{displayName}</h1>
              <UserBadges isPro={profile.is_pro} isFounder={profile.is_founder} isCampusFounder={profile.is_campus_founder} isVerifiedStudent={profile.verified_student} isBot={profile.is_bot} />
            </div>
            <p className="mt-0.5 text-[15px] text-[var(--ink-muted)]">@{profile.username}</p>
            {seeking && (
              <p className="mt-3 text-[15px] leading-snug text-[var(--ink)]">
                <span className="text-[var(--ink-faint)]">Seeking </span>
                {seeking}
              </p>
            )}
            {metaLine && <p className="mt-2 text-sm text-[var(--ink-muted)]">{metaLine}</p>}
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
        <p className="mt-6 text-sm text-[var(--ink-muted)]">
          <Link href="/login" className="font-medium text-[var(--ink)] underline-offset-2 hover:underline">
            Sign in
          </Link>{" "}
          to see experience and projects.
        </p>
      )}
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

  const robots = { index: false, follow: false };

  if (!profile) return { title: "Profile not found", robots };

  const name = profile.display_name ?? username;

  // Deliberately NOT the bio or goals. Those are written for a recruiter on
  // the page; pushing them into every Discord, Slack and Twitter embed
  // publishes them to anyone who sees the link.
  const description = `Internship dossier for @${username} on samehere.`;

  return {
    title: `${name} (@${username})`,
    description,
    robots,
    openGraph: { title: `${name} on samehere`, description, type: "profile" },
    twitter: { card: "summary_large_image", title: `${name} on samehere`, description },
  };
}

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

  const isOwner = user.id === profile.id;
  const displayName = profile.display_name ?? profile.username;

  if (!isOwner) {
    after(async () => {
      await supabase.rpc("record_profile_view", { p_viewed: profile.id });
    });
  }

  const [schoolRes, relRes, blockedIdsRes, myBlockRes, experiencesRes, educationRes, intakeRes] = await Promise.all([
    supabase.from("profile_school").select("school").eq("profile_id", profile.id).maybeSingle(),
    !isOwner
      ? supabase
          .from("follows")
          .select("status")
          .eq("follower_id", user.id)
          .eq("following_id", profile.id)
          .maybeSingle()
      : Promise.resolve({ data: null as { status: string } | null }),
    !isOwner ? supabase.rpc("get_blocked_ids") : Promise.resolve({ data: [] as string[] }),
    !isOwner
      ? supabase.from("blocks").select("id").eq("blocker_id", user.id).eq("blocked_id", profile.id).maybeSingle()
      : Promise.resolve({ data: null as { id: string } | null }),
    supabase
      .from("experiences")
      .select("id, kind, org, role, term, note, start_date, end_date, is_current")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .returns<ExperienceRow[]>(),
    supabase
      .from("education")
      .select("id, school, degree, field, start_date, end_date, school_domain, is_current")
      .eq("user_id", profile.id)
      .order("start_date", { ascending: false, nullsFirst: false })
      .returns<EducationRow[]>(),
    isOwner
      ? supabase
          .from("intake_responses")
          .select("answers")
          .eq("user_id", profile.id)
          .order("version", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null as { answers: unknown } | null }),
  ]);

  const school = schoolRes.data?.school ?? null;
  const experiences = experiencesRes.data ?? [];
  const education = educationRes.data ?? [];
  const targetRoles = targetRolesFromAnswers(intakeRes.data?.answers);

  const currentExp = currentNewestFirst(experiences)[0] ?? null;
  const currentEdu = pickPrimaryEducation(currentNewestFirst(education)) ?? null;
  const seeking = dossierSeekingLine({
    targetRoles,
    goals: profile.goals,
    currentKind: currentExp?.kind,
    currentRole: currentExp?.role,
    currentOrg: currentExp?.org,
    major: profile.major,
  });
  const eduPhrase = currentEdu
    ? currentEdu.field
      ? `${currentEdu.field} at ${currentEdu.school}`
      : currentEdu.degree
        ? `${currentEdu.degree} at ${currentEdu.school}`
        : currentEdu.school
    : null;
  const metaLine = eduPhrase || schoolMetaLine(school, profile.major);

  const logoNames = [...new Set(experiences.map((e) => e.org))];
  const logoByOrg = new Map<string, string | null>();
  if (logoNames.length > 0) {
    const { data: companies } = await supabase.from("job_companies").select("name, logo_url").in("name", logoNames);
    for (const company of companies ?? []) {
      logoByOrg.set(company.name.trim().toLowerCase(), company.logo_url);
    }
  }

  const isBlocked = !!(blockedIdsRes.data ?? []).includes(profile.id);
  const amIBlocking = !!myBlockRes.data;
  const followState: FollowState =
    relRes.data?.status === "accepted" ? "following" : relRes.data?.status === "pending" ? "pending" : "none";

  const hideProof = isBlocked;
  const proofEmpty = experiences.length === 0 && education.length === 0;

  const pro = isPro(profile);
  const bannerUrl = pro ? profile.banner_url : null;
  const theme = pro && isProfileTheme(profile.profile_theme) ? profile.profile_theme : null;
  const accentColor = theme ? PROFILE_THEMES[theme].accent : null;
  const themeVars = themeCssVars(theme);

  return (
    <main
      className={`page-enter mx-auto max-w-2xl px-4 py-6 sm:px-5 sm:py-8${theme ? " profile-themed" : ""}`}
      style={themeVars}
    >
      <div className="theme-zone">
      <section className="card overflow-hidden">
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
            style={{
              background: `linear-gradient(120deg, color-mix(in srgb, ${theme ? "var(--profile-accent)" : "var(--blue)"} 14%, var(--surface-card)) 0%, var(--surface-card) 62%)`,
            }}
          />
        )}

        <div className="px-5 pb-5 sm:px-6 sm:pb-6">
          <div className="flex items-end justify-between gap-3">
            <AvatarBase
              src={profile.avatar_url}
              seed={profile.username}
              name={displayName}
              pro={pro}
              style={accentColor ? { borderColor: accentColor } : undefined}
              className="-mt-12 h-24 w-24 shrink-0 rounded-full border-4 border-[var(--surface-card)] text-3xl sm:-mt-14 sm:h-28 sm:w-28"
            />

            {isOwner ? (
              <Link href="/profile/edit" className="btn-ghost shrink-0 !rounded-full !px-4 !py-1.5 text-sm">
                Edit dossier
              </Link>
            ) : (
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
            )}
          </div>

          <div className="mt-3">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <h1 className="text-2xl font-semibold tracking-[-0.025em] sm:text-[28px]">{displayName}</h1>
              <UserBadges isPro={profile.is_pro} isFounder={profile.is_founder} isCampusFounder={profile.is_campus_founder} isVerifiedStudent={profile.verified_student} isBot={profile.is_bot} />
            </div>
            <p className="mt-0.5 text-[15px] text-[var(--ink-muted)]">@{profile.username}</p>
            {seeking && (
              <p className="mt-3 text-[15px] leading-snug text-[var(--ink)]">
                <span className="text-[var(--ink-faint)]">Seeking </span>
                {seeking}
              </p>
            )}
            {metaLine && <p className="mt-2 text-sm text-[var(--ink-muted)]">{metaLine}</p>}
          </div>

          {profile.bio && (
            <p className="mt-5 max-w-[60ch] whitespace-pre-line break-words text-[17px] leading-[1.6] text-[var(--ink)]">
              {profile.bio}
            </p>
          )}
        </div>
      </section>

      {hideProof ? (
        <div className="card mt-4 px-6 py-8 text-center">
          <p className="font-medium text-[var(--ink)]">Dossier unavailable</p>
          <p className="mt-1.5 text-sm text-[var(--ink-muted)]">
            You and @{profile.username} cannot see each other&apos;s profiles.
          </p>
        </div>
      ) : (
        <>
          <DossierProof education={education} experiences={experiences} logoByOrg={logoByOrg} />
          {isOwner && proofEmpty && (
            <section className="card cascade-up mt-4 p-5 sm:p-6" style={{ "--delay": "80ms" } as CSSProperties}>
              <h2 className="text-sm font-semibold text-[var(--ink)]">Add proof</h2>
              <p className="mt-1.5 text-sm text-[var(--ink-muted)]">
                Education, internships, and projects are what recruiters see here. Use Edit dossier to add them.
              </p>
            </section>
          )}
        </>
      )}

      {!isOwner && (!isBlocked || amIBlocking) && (
        <div className="mt-3 flex justify-end">
          <BlockButton targetId={profile.id} initialBlocked={amIBlocking} />
        </div>
      )}
      </div>
    </main>
  );
}
