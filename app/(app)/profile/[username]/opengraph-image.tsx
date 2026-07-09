import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";

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
// Satori (which renders ImageResponse) supports PNG and JPEG only. Avatars are
// uploaded as WebP, which it draws as *nothing* — an empty ring. So the image is
// type-checked before use and falls back to a monogram. Supabase's image
// transform could serve a PNG, but it is a paid add-on.
// ponytail: one HEAD per render; if this ever shows up in traces, cache the
// content-type alongside avatar_url instead of probing.

export const alt = "samehere profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Light-theme tokens, lifted from app/globals.css. Satori has no CSS variables.
const CANVAS = "#f7f4ed";
const CARD = "#fcfbf8";
const INK = "#1c1c1c";
const INK_MUTED = "#5f5f5d";
const INK_FAINT = "rgba(28, 28, 28, 0.45)";
const BORDER = "rgba(28, 28, 28, 0.14)";
const BLUE = "#0075de";
const GOLD = "#a67c00";
const GREEN = "#1f8a4d";
const HM = ["rgba(28, 28, 28, 0.06)", "#bcd8f5", "#5fa0e8", "#0075de"];

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

// Satori draws WebP as nothing. Only hand it a type it can actually decode.
async function usableAvatar(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { method: "HEAD" });
    const type = res.headers.get("content-type") ?? "";
    return /^image\/(png|jpeg|jpg)$/i.test(type) ? url : null;
  } catch {
    return null;
  }
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

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <div
      style={{
        display: "flex",
        fontSize: 17,
        fontWeight: 600,
        color,
        border: `1px solid ${color}33`,
        background: `${color}14`,
        borderRadius: 999,
        padding: "6px 16px",
      }}
    >
      {label}
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
      <div style={{ marginTop: 22, fontSize: 48, fontWeight: 600, letterSpacing: "-0.03em", color: INK }}>{name}</div>
      <div style={{ marginTop: 2, fontSize: 24, color: INK_MUTED }}>{`@${profile.username}`}</div>

      {(profile.is_founder || profile.is_campus_founder || profile.is_pro) && (
        <div style={{ display: "flex", marginTop: 16, gap: 8 }}>
          {profile.is_founder && <Badge label="Founder" color={GOLD} />}
          {profile.is_campus_founder && <Badge label="Social Butterfly" color={GREEN} />}
          {profile.is_pro && <Badge label="Pro" color={BLUE} />}
        </div>
      )}

      {meta.length > 0 && <div style={{ marginTop: 18, fontSize: 20, color: INK_FAINT }}>{meta}</div>}

      {counts && (
        <div style={{ display: "flex", marginTop: 20, gap: 28 }}>
          <Stat value={counts.posts} label="posts" />
          <Stat value={counts.followers} label="followers" />
          <Stat value={counts.following} label="following" />
        </div>
      )}

      {profile.is_private && (
        <div style={{ marginTop: 20, fontSize: 20, color: INK_FAINT }}>This account is private.</div>
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
              background: "rgba(0, 117, 222, 0.10)",
              border: "1px solid rgba(0, 117, 222, 0.22)",
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
        marginTop: 28,
        paddingTop: 24,
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

  // No such user, or a name that isn't public: brand card, nothing personal.
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
    usableAvatar(profile.avatar_url),
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
            padding: 48,
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
