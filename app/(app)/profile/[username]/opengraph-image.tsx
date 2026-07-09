import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";

// Dynamic per-profile OG card. Renders the real contribution heatmap when the
// profile is public + has activity — the shareable, screenshot-worthy asset.
// Falls back to a plain branded card otherwise. Never errors.
//
// IMPORTANT: this runs with NO user session (crawlers, link unfurls) — only the
// public anon key is available. `profiles` RLS requires auth.uid() is not null
// (see CLAUDE.md Security #12), so we go through the anon-safe definer RPCs
// get_public_profile_card + get_public_heatmap, which self-guard to non-private,
// heatmap-public profiles. Private/hidden profiles return nothing and render the
// plain fallback card, leaking nothing.

export const alt = "samehere profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CREAM = "#f7f4ed";
const INK = "#1c1c1c";
const INK_MUTED = "#5f5f5d";
const INK_FAINT = "rgba(28, 28, 28, 0.45)";
const BORDER = "rgba(28, 28, 28, 0.14)";
const SURFACE_CARD = "#f0ece4";
const BLUE = "#0075de";
const AMBER = "#b45309";
const HM = ["rgba(28, 28, 28, 0.06)", "#bcd8f5", "#5fa0e8", "#0075de"];

const level = (points: number) => (points === 0 ? 0 : points <= 3 ? 1 : points <= 7 ? 2 : 3);

type HeatmapRow = { day: string; points: number };
type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  is_pro: boolean;
  is_founder: boolean;
  is_campus_founder: boolean;
};

const WEEKS = 26;
const CELL = 13;
const CELL_GAP = 2;

// Platform's day boundary is midnight America/New_York (matches get_streak/get_heatmap).
// This gives "today" as an Eastern calendar date, then encodes it into UTC fields so
// setUTCDate/toISOString below can do pure calendar-day arithmetic against it.
function easternTodayAnchor(): Date {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" })
    .format(new Date())
    .split("-")
    .map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

// Sun-aligned grid over the last WEEKS weeks, ending today (Eastern). Mirrors
// ContributionHeatmap's grid math at a shorter window (26wk reads well at OG size).
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

// Consecutive days ending today or yesterday (Eastern), computed from the public
// heatmap rows already fetched — no auth-only get_streak call.
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

function Avatar({ src, letter, size: s }: { src: string | null; letter: string; size: number }) {
  return src ? (
    <img
      src={src}
      width={s}
      height={s}
      style={{ borderRadius: "50%", objectFit: "cover", border: `2px solid ${BORDER}` }}
    />
  ) : (
    <div
      style={{
        display: "flex",
        width: s,
        height: s,
        borderRadius: "50%",
        border: `2px solid ${BORDER}`,
        background: SURFACE_CARD,
        alignItems: "center",
        justifyContent: "center",
        fontSize: s * 0.4,
        fontWeight: 600,
        color: INK_MUTED,
      }}
    >
      {letter}
    </div>
  );
}

function Brand() {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: 22, fontWeight: 600, color: INK }}>samehere</div>
      <div style={{ marginTop: 4, fontSize: 15, color: INK_MUTED }}>Verified students only.</div>
    </div>
  );
}

function FallbackCard({ username, profile, school }: { username: string; profile: Profile | null; school: string | null }) {
  const name = profile?.display_name ?? username;
  const metaParts = [school].filter(Boolean) as string[];

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: CREAM,
      }}
    >
      <Avatar src={profile?.avatar_url ?? null} letter={name.charAt(0).toUpperCase()} size={140} />
      <div style={{ marginTop: 28, fontSize: 44, fontWeight: 600, letterSpacing: "-0.02em", color: INK }}>
        {name}
      </div>
      <div style={{ marginTop: 6, fontSize: 22, color: INK_MUTED }}>{`@${username}`}</div>
      {metaParts.length > 0 && (
        <div style={{ marginTop: 6, fontSize: 18, color: INK_FAINT }}>{metaParts.join(" · ")}</div>
      )}
      <div style={{ marginTop: 32, fontSize: 20, color: INK }}>Verified student on samehere</div>
    </div>
  );
}

function HeatmapCard({
  username,
  profile,
  school,
  weeks,
  streak,
}: {
  username: string;
  profile: Profile;
  school: string | null;
  weeks: number[][];
  streak: number;
}) {
  const name = profile.display_name ?? username;
  const metaParts = [school].filter(Boolean) as string[];

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "row",
        background: CREAM,
        padding: 64,
      }}
    >
      {/* Left: identity */}
      <div style={{ display: "flex", flexDirection: "column", width: 400, justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <Avatar src={profile.avatar_url} letter={name.charAt(0).toUpperCase()} size={96} />
          <div style={{ marginTop: 24, fontSize: 38, fontWeight: 600, letterSpacing: "-0.02em", color: INK }}>
            {name}
          </div>
          <div style={{ marginTop: 4, fontSize: 19, color: INK_MUTED }}>{`@${username}`}</div>
          {metaParts.length > 0 && (
            <div style={{ marginTop: 10, fontSize: 16, color: INK_FAINT }}>{metaParts.join(" · ")}</div>
          )}

          {(profile.is_pro || profile.is_founder || profile.is_campus_founder) && (
            <div style={{ display: "flex", marginTop: 16 }}>
              {profile.is_founder && (
                <div
                  style={{
                    display: "flex",
                    fontSize: 13,
                    fontWeight: 600,
                    color: BLUE,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 999,
                    padding: "4px 12px",
                    marginRight: 8,
                  }}
                >
                  Founder
                </div>
              )}
              {profile.is_campus_founder && (
                <div
                  style={{
                    display: "flex",
                    fontSize: 13,
                    fontWeight: 600,
                    color: AMBER,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 999,
                    padding: "4px 12px",
                    marginRight: 8,
                  }}
                >
                  Social Butterfly
                </div>
              )}
              {profile.is_pro && (
                <div
                  style={{
                    display: "flex",
                    fontSize: 13,
                    fontWeight: 600,
                    color: BLUE,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 999,
                    padding: "4px 12px",
                  }}
                >
                  Pro
                </div>
              )}
            </div>
          )}

          {streak > 0 && (
            <div style={{ marginTop: 16, fontSize: 17, fontWeight: 600, color: INK }}>
              {`${streak} day streak`}
            </div>
          )}
        </div>

        <Brand />
      </div>

      {/* Right: heatmap */}
      <div style={{ display: "flex", flex: 1, flexDirection: "column", justifyContent: "center", paddingLeft: 40 }}>
        <div style={{ display: "flex", fontSize: 15, fontWeight: 600, color: INK, marginBottom: 14 }}>
          Contribution activity
        </div>
        <div style={{ display: "flex", flexDirection: "row" }}>
          {weeks.map((col, wi) => (
            <div
              key={wi}
              style={{
                display: "flex",
                flexDirection: "column",
                marginRight: wi === weeks.length - 1 ? 0 : CELL_GAP,
              }}
            >
              {col.map((points, di) => (
                <div
                  key={di}
                  style={{
                    width: CELL,
                    height: CELL,
                    marginBottom: di === 6 ? 0 : CELL_GAP,
                    borderRadius: 3,
                    background: points < 0 ? "transparent" : HM[level(points)],
                  }}
                />
              ))}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", marginTop: 16, fontSize: 13, color: INK_FAINT }}>
          <div style={{ display: "flex", marginRight: 6 }}>Less</div>
          {HM.map((c, i) => (
            <div
              key={i}
              style={{ width: 12, height: 12, borderRadius: 3, background: c, marginRight: 5 }}
            />
          ))}
          <div style={{ display: "flex" }}>More</div>
        </div>
      </div>
    </div>
  );
}

export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  let profile: Profile | null = null;
  let school: string | null = null;
  let heatmapRows: HeatmapRow[] = [];

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      // Anon-safe: returns a row only for non-private profiles; school already
      // null when hidden. ponytail: one RPC covers the whole identity block.
      const { data: cardRows } = await supabase.rpc("get_public_profile_card", { p_username: username });
      const card = cardRows?.[0];
      if (card) {
        profile = {
          id: card.id,
          display_name: card.display_name,
          avatar_url: card.avatar_url,
          is_pro: card.is_pro,
          is_founder: card.is_founder,
          is_campus_founder: card.is_campus_founder,
        };
        school = card.school ?? null;
        const { data: heatRes } = await supabase.rpc("get_public_heatmap", { p_profile_id: card.id });
        heatmapRows = (heatRes ?? []) as HeatmapRow[];
      }
    }
  } catch {
    // ponytail: any fetch/RLS failure falls through to the branded fallback below
  }

  const card =
    profile && heatmapRows.length > 0 ? (
      <HeatmapCard
        username={username}
        profile={profile}
        school={school}
        weeks={buildWeeks(heatmapRows)}
        streak={currentStreak(heatmapRows)}
      />
    ) : (
      <FallbackCard username={username} profile={profile} school={school} />
    );

  return new ImageResponse(card, { ...size });
}
