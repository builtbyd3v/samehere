import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

// Dynamic per-profile OG card — the shareable, screenshot-worthy asset.
//
// IMPORTANT: this runs with NO user session (crawlers, link unfurls) — only the
// public anon key is available. `profiles` RLS requires auth.uid() is not null,
// so everything comes through anon-granted SECURITY DEFINER RPCs:
//   get_public_profile        — nulls a private account's fields itself
//   get_public_profile_counts — three integers, never the follower lists
//   get_public_heatmap        — self-guards on heatmap_visibility + is_private
// Private / heatmap-hidden profiles fall back to the identity card, leaking nothing.
//
// Dark by default: an unfurl sits in Discord, Slack and Twitter, which are dark
// for most people. A cream card in a dark feed reads as a blown-out rectangle.
// Tokens below are lifted verbatim from the `.dark` block in app/globals.css —
// Satori has no CSS variables, so they are duplicated here on purpose.
//
// sharp is a direct dependency for exactly one reason: Satori decodes PNG and
// JPEG only, and avatars are uploaded as WebP, which it silently draws as
// nothing (an empty ring). Supabase's image transform would serve a PNG but is
// a paid add-on. We fetch, transcode, and inline as a data URI.
// ponytail: one fetch + transcode per render. If it shows in traces, cache the
// PNG next to avatar_url at upload time instead.

export const runtime = "nodejs"; // sharp is not available on the edge runtime.

export const alt = "samehere profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// --- .dark tokens, app/globals.css ---
const CANVAS = "#141310";
const CARD = "#1c1a16";
const INK = "#f2efe6";
const INK_MUTED = "#a8a49a";
const INK_FAINT = "rgba(242, 239, 230, 0.40)";
const BORDER = "rgba(247, 244, 237, 0.10)";
const BLUE = "#4f9fe8";
const GOLD = "#ecc94b"; // --founder
const GREEN = "#5fce8f"; // --campus-founder (Social Butterfly)
const HM = ["rgba(247, 244, 237, 0.07)", "#1e3a5f", "#2f6db0", "#4f9fe8"]; // --hm0..3

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

// Platform's day boundary is midnight America/New_York (matches get_streak/get_heatmap).
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

// Satori decodes PNG/JPEG only. Transcode anything else (avatars are WebP) and
// inline it, so the card shows the real face rather than an empty ring.
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

/** 45% alpha of a #rrggbb, for the butterfly's set-back wings. */
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

/** Same drawing as components/icons.tsx — wings separate by tone, not by gaps. */
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
  const s = 112;
  return src ? (
    <img src={src} width={s} height={s} style={{ borderRadius: "50%", objectFit: "cover", border: `3px solid ${BORDER}` }} />
  ) : (
    <div
      style={{
        display: "flex",
        width: s,
        height: s,
        borderRadius: "50%",
        border: `3px solid ${BORDER}`,
        background: CANVAS,
        alignItems: "center",
        justifyContent: "center",
        fontSize: 46,
        fontWeight: 600,
        color: INK_MUTED,
      }}
    >
      {letter}
    </div>
  );
}

/**
 * Badges sit beside the display name as bare icons, exactly as UserBadges
 * renders them in the app. Pills on their own row read as a different product,
 * and they cost ~50px of height the card doesn't have.
 */
function NameRow({ name, profile }: { name: string; profile: Profile }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ display: "flex", fontSize: 48, fontWeight: 600, letterSpacing: "-0.03em", color: INK }}>
        {name}
      </div>
      {profile.is_founder && <IconCrown color={GOLD} />}
      {profile.is_campus_founder && <IconButterfly color={GREEN} />}
      {profile.is_pro && <IconBolt color={BLUE} />}
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline" }}>
      <div style={{ fontSize: 26, fontWeight: 600, color: INK }}>{value.toLocaleString()}</div>
      <div style={{ marginLeft: 7, fontSize: 19, color: INK_MUTED }}>{label}</div>
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
      <div style={{ display: "flex", marginTop: 22 }}>
        <NameRow name={name} profile={profile} />
      </div>
      <div style={{ marginTop: 2, fontSize: 24, color: INK_MUTED }}>{`@${profile.username}`}</div>

      {meta.length > 0 && <div style={{ marginTop: 16, fontSize: 20, color: INK_FAINT }}>{meta}</div>}

      {counts && (
        <div style={{ display: "flex", marginTop: 20, gap: 28 }}>
          <Stat value={counts.posts} label="posts" />
          <Stat value={counts.followers} label="followers" />
          <Stat value={counts.following} label="following" />
        </div>
      )}

      {profile.is_private && (
        <div style={{ marginTop: 18, fontSize: 20, color: INK_FAINT }}>This account is private.</div>
      )}
    </div>
  );
}

function Heatmap({ weeks, streak }: { weeks: number[][]; streak: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: INK }}>Contribution activity</div>
        {streak > 0 && (
          <div
            style={{
              display: "flex",
              fontSize: 17,
              fontWeight: 600,
              color: BLUE,
              background: "rgba(79, 159, 232, 0.14)",
              border: "1px solid rgba(79, 159, 232, 0.30)",
              borderRadius: 999,
              padding: "5px 14px",
            }}
          >
            {streak === 1 ? "1 day streak" : `${streak} day streak`}
          </div>
        )}
      </div>

      <div style={{ display: "flex", marginTop: 22, gap: GAP }}>
        {weeks.map((col, w) => (
          <div key={w} style={{ display: "flex", flexDirection: "column", gap: GAP }}>
            {col.map((pts, d) => (
              <div
                key={d}
                style={{
                  width: CELL,
                  height: CELL,
                  borderRadius: 4,
                  background: pts < 0 ? "transparent" : HM[level(pts)],
                }}
              />
            ))}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", marginTop: 20, alignItems: "center", gap: 7 }}>
        <div style={{ fontSize: 16, color: INK_FAINT }}>Less</div>
        {HM.map((c, i) => (
          <div key={i} style={{ width: 14, height: 14, borderRadius: 3, background: c }} />
        ))}
        <div style={{ fontSize: 16, color: INK_FAINT }}>More</div>
      </div>
    </div>
  );
}

function Footer({ username }: { username: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        marginTop: 24,
        paddingTop: 22,
        borderTop: `1px solid ${BORDER}`,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", color: INK }}>samehere</div>
        <div style={{ marginTop: 3, fontSize: 17, color: INK_MUTED }}>Verified students only.</div>
      </div>
      <div style={{ fontSize: 17, color: INK_FAINT }}>{`samehere.dev/profile/${username}`}</div>
    </div>
  );
}

export default async function OgImage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data: rows } = await supabase.rpc("get_public_profile", { p_username: username });
  const profile = (rows as Profile[] | null)?.[0] ?? null;

  // No such user: brand card, nothing personal.
  if (!profile) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: 80,
            background: CANVAS,
            color: INK,
          }}
        >
          <div style={{ fontSize: 60, fontWeight: 600, letterSpacing: "-0.03em" }}>samehere</div>
          <div style={{ marginTop: 18, fontSize: 26, color: INK_MUTED }}>Verified students only.</div>
        </div>
      ),
      { ...size },
    );
  }

  const [avatar, countsRes, heatRes] = await Promise.all([
    avatarDataUri(profile.avatar_url),
    supabase.rpc("get_public_profile_counts", { p_profile_id: profile.id }),
    profile.heatmap_visibility === "public" && !profile.is_private
      ? supabase.rpc("get_public_heatmap", { p_profile_id: profile.id })
      : Promise.resolve({ data: null }),
  ]);

  const counts = ((countsRes.data as Counts[] | null)?.[0] ?? null) as Counts | null;
  const heat = (heatRes.data as HeatmapRow[] | null) ?? [];
  const showHeatmap = heat.length > 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: CANVAS,
          padding: 44,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            background: CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 28,
            // 630 - (44 outer * 2) = 542 inner card height. Content (identity +
            // footer) must fit inside 542 - (44 * 2) = 454, or the card grows and
            // eats the bottom outer padding while the top keeps its 44px.
            padding: 44,
            justifyContent: "space-between",
          }}
        >
          {/* alignItems:center vertically centres the heatmap against the taller
              identity column — otherwise it top-aligns and leaves dead space. */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexGrow: 1 }}>
            <div style={{ display: "flex", width: showHeatmap ? 470 : 1000 }}>
              <Identity profile={profile} avatar={avatar} counts={counts} />
            </div>
            {showHeatmap && <Heatmap weeks={buildWeeks(heat)} streak={currentStreak(heat)} />}
          </div>

          <Footer username={profile.username} />
        </div>
      </div>
    ),
    { ...size },
  );
}
