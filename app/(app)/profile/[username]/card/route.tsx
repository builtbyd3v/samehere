import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { avatarDataUri } from "@/lib/og/avatar";
import { loadOgFonts } from "@/lib/og/fonts";
import { BrandFallback, PortfolioExportCard } from "@/lib/og/portfolio-card";
import {
  CARD_SIZES,
  cardCacheControl,
  cardUrlText,
  isCardUsername,
  parseCardFormat,
} from "@/lib/portfolio/card-format";
import { hasPortfolioAuthCookie, portfolioReadClient } from "@/lib/portfolio/client";
import { publicIntro } from "@/lib/portfolio/projection";
import { loadPublicPortfolioBundle } from "@/lib/portfolio/public";
import { deriveSkills } from "@/lib/portfolio/skills";
import { FOCUS_LABELS, STAGE_LABELS, parseStage, type FocusArea } from "@/lib/stage";

// PNG export of the public portfolio in three sizes. Same privacy shape as the OG
// card: the viewer's session client (block context kept), get_public_profile for
// identity, and only published projects from the public bundle.

type Ctx = { params: Promise<{ username: string }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  const { username } = await ctx.params;
  const format = parseCardFormat(request.nextUrl.searchParams.get("format"));
  if (!format) return new Response("Unknown format", { status: 400 });

  const fonts = await loadOgFonts();
  const signedIn = await hasPortfolioAuthCookie();
  const options = { ...CARD_SIZES[format], fonts, headers: { "cache-control": cardCacheControl(signedIn) } };
  if (!isCardUsername(username)) return new ImageResponse(<BrandFallback />, { ...options, status: 404 });

  const supabase = await portfolioReadClient(signedIn);
  const { data: rows } = await supabase.rpc("get_public_profile", { p_username: username });
  const profile = rows?.[0] ?? null;
  if (!profile) return new ImageResponse(<BrandFallback />, { ...options, status: 404 });

  // Private means identity card only: never read the portfolio bundle.
  const bundle = profile.is_private ? null : await loadPublicPortfolioBundle(supabase, username);
  const data = bundle?.ok ? bundle.data : null;
  const projects = data?.sections.projects ?? [];
  const heat = data?.projection?.activity_visible ? data.samehere : [];
  const avatar = await avatarDataUri(profile.avatar_url, 224);
  // Same gate as the logged-out page: stage and focus only when the intro section is public.
  const intro = publicIntro(profile, data?.projection ?? null);
  const stageKey = parseStage(intro.stage);
  const focus = intro.focus_areas
    .filter((f): f is FocusArea => Object.hasOwn(FOCUS_LABELS, f))
    .map((f) => FOCUS_LABELS[f])
    .slice(0, 3);

  return new ImageResponse(
    (
      <PortfolioExportCard
        format={format}
        profile={profile}
        avatar={avatar}
        // The logged-out page reads headline straight from get_public_profile, which nulls it when private.
        headline={profile.is_private ? null : profile.headline}
        stage={stageKey ? STAGE_LABELS[stageKey] : null}
        focus={focus}
        school={profile.school}
        // Public projects only (get_public_portfolio_projects), never owner drafts.
        skills={deriveSkills(projects, 5)}
        projectTitles={projects.slice(0, 2).map((p) => p.title)}
        heat={heat}
        urlText={cardUrlText(profile.username)}
      />
    ),
    options,
  );
}
