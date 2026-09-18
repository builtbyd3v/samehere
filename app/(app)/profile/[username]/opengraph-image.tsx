import { ImageResponse } from "next/og";
import sharp from "sharp";
import { BLUE, BORDER, CANVAS, GOLD, GREEN, HM, INK, INK_FAINT, INK_MUTED } from "@/lib/og-tokens";
import { loadOgFonts } from "@/lib/og/fonts";
import { OgWordmark, ogCanvasStyle } from "@/lib/og/mark";
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

const level = (points: number) => (points === 0 ? 0 : points <= 3 ? 1 : points <= 7 ? 2 : 3);

type HeatmapRow = { day: string; points: number };
type Profile = {
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
  school: string | null;
  verified_student: boolean;
  open_to?: string[] | null;
};
type Counts = { posts: number; followers: number; following: number };

const WEEKS = 26;
const CELL = 16;
const GAP = 3;

const YEAR_LABEL: Record<string, string> = {
  freshman: "Freshman",
  sophomore: "Sophomore",
  junior: "Junior",
  senior: "Senior",
  grad: "Grad student",
};

function easternTodayAnchor(): Date {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" })
    .format(new Date())
    .split("-")
    .map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function buildWeeks(rows: HeatmapRow[]): number[][] {
  const byDate = new Map(rows.map((r) => [r.day, Number(r.points)]));
  const end = easternTodayAnchor();
  const firstSunday = new Date(end);
  firstSunday.setUTCDate(end.getUTCDate() - end.getUTCDay() - (WEEKS - 1) * 7);

  const cols: number[][] = [];
  for (let w = 0; w < WEEKS; w++) {
    const col: number[] = [];
    for (let d = 0; d < 7; d++) {
      const cur = new Date(firstSunday);
      cur.setUTCDate(firstSunday.getUTCDate() + w * 7 + d);
      col.push(cur > end ? -1 : (byDate.get(cur.toISOString().slice(0, 10)) ?? 0));
    }
    cols.push(col);
  }
  return cols;
}

function currentStreak(rows: HeatmapRow[]): number {
  const activeDays = new Set(rows.filter((r) => Number(r.points) > 0).map((r) => r.day));
  if (activeDays.size === 0) return 0;
  const cursor = easternTodayAnchor();
  if (!activeDays.has(cursor.toISOString().slice(0, 10))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  let streak = 0;
  while (activeDays.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

async function avatarDataUri(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const png = await sharp(buf).resize(224, 224, { fit: "cover" }).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

const fade = (hex: string) => `${hex}73`;
const ICON = 28;

function IconCrown({ color }: { color: string }) {
  return (
    <svg width={ICON} height={ICON} viewBox="0 0 24 24">
      <path fill={color} d="M3 8l4.5 3.2L12 5l4.5 6.2L21 8l-1.6 10.4a1 1 0 0 1-1 .6H5.6a1 1 0 0 1-1-.6L3 8Z" />
    </svg>
  );
}

function IconBolt({ color }: { color: string }) {
  return (
    <svg width={ICON} height={ICON} viewBox="0 0 24 24">
      <path fill={color} d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2Z" />
    </svg>
  );
}

function IconGradCap({ color }: { color: string }) {
  return (
    <svg width={ICON} height={ICON} viewBox="0 0 24 24">
      <path fill={color} d="M12 3 1 8l11 5 9-4.09V17h2V8Z" />
      <path fill={color} d="M5 10.18V15c0 1.66 3.13 3 7 3s7-1.34 7-3v-4.82l-7 3.18Z" />
    </svg>
  );
}

function IconButterfly({ color }: { color: string }) {
  return (
    <svg width={ICON} height={ICON} viewBox="0 0 24 24">
      <path fill={fade(color)} d="M11 3.4C9 4.6 7.8 7 8.2 9.4c.4 2.3 2.1 3.8 4 4.1-.5-2.1-.5-5 .1-7.3.3-1.2-.3-2.3-1.3-2.8Z" />
      <path fill={fade(color)} d="M13.5 14.6c-1.6-.8-4.5-1.2-6.5-.3-2.4 1-2.7 3.7-.5 4.6 2.3 1 5.3-.7 6.9-3 .2-.5.2-.9.1-1.3Z" />
      <path fill={color} d="M14.6 2.6c2.6.6 4.8 3.4 5 6.8.2 3-1.2 5-3 5.9-1.4-1.1-3-3.3-3.6-5.7-.5-2.2.2-5.2 1.6-7Z" />
      <path fill={color} d="M17 16.2c-1 1.2-3 2.8-5 3.8-1.4.7-2.6 1-3 .7-.1-.5 1-1.3 2.4-2.1 2-1.2 4-2.2 5-3Z" />
      <circle cx="17.4" cy="15.2" r="1.15" fill={color} />
      <path d="M18 14.4c1-1.2 2-2 2.7-2.3" stroke={color} strokeWidth="1" strokeLinecap="round" fill="none" />
      <circle cx="21" cy="11.9" r="0.75" fill={color} />
    </svg>
  );
}

function Avatar({ src, letter }: { src: string | null; letter: string }) {
  const s = 120;
  return src ? (
    <img
      src={src}
      width={s}
      height={s}
      style={{ borderRadius: "50%", objectFit: "cover", border: `3px solid ${CANVAS}` }}
    />
  ) : (
    <div
      style={{
        display: "flex",
        width: s,
        height: s,
        borderRadius: "50%",
        border: `3px solid ${BORDER}`,
        background: "#161616",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 48,
        fontWeight: 600,
        color: INK_MUTED,
      }}
    >
      {letter}
    </div>
  );
}

function NameRow({ name, profile }: { name: string; profile: Profile }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ display: "flex", fontSize: 48, fontWeight: 600, letterSpacing: "-0.03em", color: INK }}>
        {name}
      </div>
      {profile.is_founder && <IconCrown color={GOLD} />}
      {profile.is_campus_founder && <IconButterfly color={GREEN} />}
      {profile.verified_student && <IconGradCap color={INK_MUTED} />}
      {profile.is_pro && <IconBolt color={BLUE} />}
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline" }}>
      <div style={{ fontSize: 26, fontWeight: 600, color: INK }}>{value.toLocaleString()}</div>
      <div style={{ marginLeft: 7, fontSize: 18, color: INK_MUTED }}>{label}</div>
    </div>
  );
}

function Identity({ profile, avatar, counts }: { profile: Profile; avatar: string | null; counts: Counts | null }) {
  const name = profile.display_name ?? profile.username;
  const meta = [profile.year ? YEAR_LABEL[profile.year] : null, profile.major, profile.school]
    .filter(Boolean)
    .join(" · ");

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <Avatar src={avatar} letter={name.charAt(0).toUpperCase()} />
      <div style={{ display: "flex", marginTop: 20 }}>
        <NameRow name={name} profile={profile} />
      </div>
      <div style={{ marginTop: 4, fontSize: 24, color: INK_MUTED }}>{`@${profile.username}`}</div>
      <div style={{ marginTop: 10, fontSize: 18, color: BLUE }}>Portfolio on samehere</div>

      {meta.length > 0 && <div style={{ marginTop: 14, fontSize: 20, color: INK_FAINT }}>{meta}</div>}

      {counts && (
        <div style={{ display: "flex", marginTop: 18, gap: 28 }}>
          <Stat value={counts.posts} label="posts" />
          <Stat value={counts.followers} label="followers" />
          <Stat value={counts.following} label="following" />
        </div>
      )}

      {profile.is_private && (
        <div style={{ marginTop: 16, fontSize: 20, color: INK_FAINT }}>This account is private.</div>
      )}
    </div>
  );
}

function Heatmap({ weeks, streak }: { weeks: number[][]; streak: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: INK }}>Activity</div>
        {streak > 0 && (
          <div style={{ display: "flex", fontSize: 16, fontWeight: 600, color: BLUE }}>
            {`${streak}-day streak`}
          </div>
        )}
      </div>

      <div style={{ display: "flex", marginTop: 18, gap: GAP }}>
        {weeks.map((col, w) => (
          <div key={w} style={{ display: "flex", flexDirection: "column", gap: GAP }}>
            {col.map((pts, d) => (
              <div
                key={d}
                style={{
                  width: CELL,
                  height: CELL,
                  borderRadius: 3,
                  background: pts < 0 ? "transparent" : HM[level(pts)],
                }}
              />
            ))}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", marginTop: 16, alignItems: "center", gap: 7 }}>
        <div style={{ fontSize: 15, color: INK_FAINT }}>Less</div>
        {HM.map((c, i) => (
          <div key={i} style={{ width: 13, height: 13, borderRadius: 2, background: c }} />
        ))}
        <div style={{ fontSize: 15, color: INK_FAINT }}>More</div>
      </div>
    </div>
  );
}

function BrandFallback() {
  return (
    <div style={ogCanvasStyle({ justifyContent: "center", alignItems: "center", padding: 80 })}>
      <OgWordmark size={72} />
      <div style={{ marginTop: 20, fontSize: 24, color: INK_MUTED }}>Portfolio for students.</div>
      <div style={{ marginTop: 10, fontSize: 18, color: INK_FAINT }}>samehere.dev</div>
    </div>
  );
}

export default async function OgImage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await portfolioViewerClient();

  const { data: rows } = await supabase.rpc("get_public_profile", { p_username: username });
  const profile = (rows as Profile[] | null)?.[0] ?? null;

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
    avatarDataUri(profile.avatar_url),
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
