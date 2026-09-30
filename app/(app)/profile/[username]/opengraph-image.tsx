import { ImageResponse } from "next/og";
import { BORDER, INK_FAINT } from "@/lib/og-tokens";
import { avatarDataUri } from "@/lib/og/avatar";
import { loadOgFonts } from "@/lib/og/fonts";
import { OgWordmark, ogCanvasStyle } from "@/lib/og/mark";
import {
  BrandFallback,
  Heatmap,
  Identity,
  buildWeeks,
  currentStreak,
  type Counts,
  type HeatmapRow,
  type OgProfile,
} from "@/lib/og/portfolio-card";
import { portfolioBannerOg } from "@/lib/portfolio/banner";
import { portfolioViewerClient } from "@/lib/portfolio/client";
import { getPublicPortfolio } from "@/lib/portfolio/public";

// Dynamic per-profile OG card — the shareable, screenshot-worthy asset.
//
// Crawlers have no session cookie, so this uses the anon key. A signed-in
// viewer keeps the session client so block context is not erased. RPCs:
//   get_public_profile / get_public_profile_counts / get_public_heatmap
// Private / heatmap-hidden profiles fall back to the identity card.
//
// Premium / x.ai language: full-bleed dark canvas + soft banner strip (no inset
// picture-frame). Share button on /profile/[username] is unchanged.

export const runtime = "nodejs";

export const alt = "samehere portfolio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

export default async function OgImage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await portfolioViewerClient();

  const { data: rows } = await supabase.rpc("get_public_profile", { p_username: username });
  const profile = (rows as OgProfile[] | null)?.[0] ?? null;

  const fonts = await loadOgFonts();

  if (!profile) {
    return new ImageResponse(<BrandFallback />, { ...size, fonts });
  }

  const projection = await getPublicPortfolio(supabase, username);
  const activityVisible = projection.ok
    ? Boolean(projection.data?.activity_visible)
    : !projection.unavailable && profile.heatmap_visibility === "public" && !profile.is_private;
  const heatmapFallback =
    !projection.ok && projection.unavailable && profile.heatmap_visibility === "public" && !profile.is_private;
  const [avatar, countsRes, heatRes] = await Promise.all([
    avatarDataUri(profile.avatar_url, 224),
    supabase.rpc("get_public_profile_counts", { p_profile_id: profile.id }),
    activityVisible || heatmapFallback
      ? supabase.rpc("get_public_heatmap", { p_profile_id: profile.id })
      : Promise.resolve({ data: null }),
  ]);

  const counts = ((countsRes.data as Counts[] | null)?.[0] ?? null) as Counts | null;
  const heat = (heatRes.data as HeatmapRow[] | null) ?? [];
  const showHeatmap = heat.length > 0;
  const banner = portfolioBannerOg(profile.username);

  return new ImageResponse(
    (
      <div style={ogCanvasStyle()}>
        <div
          style={{
            display: "flex",
            width: "100%",
            height: 96,
            backgroundColor: "#161616",
            backgroundImage: `linear-gradient(120deg, ${banner.from} 0%, ${banner.to} 100%)`,
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            padding: "28px 56px 40px",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexGrow: 1 }}>
            <div style={{ display: "flex", width: showHeatmap ? 480 : 1000 }}>
              <Identity profile={profile} avatar={avatar} counts={counts} />
            </div>
            {showHeatmap && <Heatmap weeks={buildWeeks(heat)} streak={currentStreak(heat)} />}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              marginTop: 20,
              paddingTop: 20,
              borderTop: `1px solid ${BORDER}`,
            }}
          >
            <OgWordmark size={24} />
            <div style={{ fontSize: 17, color: INK_FAINT }}>{`samehere.dev/profile/${profile.username}`}</div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
