import { readFile } from "node:fs/promises";
import { ImageResponse } from "next/og";

// Site-wide OG card — what samehere.dev itself unfurls as.
//
// Dark by default, matching the per-profile card: an unfurl lives in Discord,
// Slack and Twitter, which are dark for most people, and a cream card in a dark
// feed reads as a blown-out rectangle. Tokens are lifted verbatim from the
// `.dark` block in app/globals.css — Satori has no CSS variables, so they are
// duplicated here on purpose. If the app is restyled, this card will not follow.

export const runtime = "nodejs"; // reads the font files off disk

export const alt = "samehere: the network for verified students";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The app is set in Figtree (app/layout.tsx). Satori ships no fonts and falls
// back to a generic sans, which renders 600-weight as something closer to 400 —
// that is why the wordmark looked thin next to the real navbar.
//
// Resolved with `new URL(..., import.meta.url)`, which Next traces statically.
// `join(process.cwd(), ...)` is a runtime string: it works locally and the file
// is missing from the deployed bundle, so the route 500s only in production.
const fonts = async () => {
  const [regular, semibold] = await Promise.all([
    readFile(new URL("./fonts/Figtree-Regular.ttf", import.meta.url)),
    readFile(new URL("./fonts/Figtree-SemiBold.ttf", import.meta.url)),
  ]);
  return [
    { name: "Figtree", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Figtree", data: semibold, weight: 600 as const, style: "normal" as const },
  ];
};

// --- .dark tokens, app/globals.css ---
const CANVAS = "#141310";
const CARD = "#1c1a16";
const INK = "#f2efe6";
const INK_MUTED = "#a8a49a";
const INK_FAINT = "rgba(242, 239, 230, 0.40)";
const BORDER = "rgba(247, 244, 237, 0.10)";
const BLUE = "#4f9fe8";
const HM = ["rgba(247, 244, 237, 0.07)", "#1e3a5f", "#2f6db0", "#4f9fe8"]; // --hm0..3

const WEEKS = 17;
const CELL = 18;
const GAP = 4;

// A fixed, plausible contribution pattern, denser toward the right the way a
// real profile is. Deterministic on purpose: an OG image is fetched repeatedly
// by crawlers and CDNs, and a card that changes shape between fetches looks
// broken. No Math.random.
// Thresholds are tuned so most cells are empty. A dense grid reads as static,
// not as a person's year — a real contribution graph is sparse with clusters.
const density = (w: number, d: number) => {
  // Mix week and day independently, then avalanche. A single hash of (w*7+d)
  // correlates with the day index and bands the grid — the top rows come out
  // empty and everything clusters along the bottom.
  let n = Math.imul(w + 1, 374761393) ^ Math.imul(d + 1, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  const v = (n >>> 16) % 100;
  const recent = w / WEEKS; // busier toward the right, the way an active profile is
  if (v > 96 - recent * 14) return 3;
  if (v > 90 - recent * 18) return 2;
  if (v > 74 - recent * 24) return 1;
  return 0;
};

/** The wordmark: `same` in ink, `here` in blue. Matches Navbar and LandingNav. */
function Wordmark({ size: s }: { size: number }) {
  return (
    <div style={{ display: "flex", fontSize: s, fontWeight: 600, letterSpacing: "-0.02em" }}>
      <div style={{ display: "flex", color: INK }}>same</div>
      <div style={{ display: "flex", color: BLUE }}>here</div>
    </div>
  );
}

export default async function OgImage() {
  const weeks = Array.from({ length: WEEKS }, (_, w) => Array.from({ length: 7 }, (_, d) => density(w, d)));
  const font = await fonts();

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
          fontFamily: "Figtree",
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
            padding: 52,
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexGrow: 1 }}>
            <div style={{ display: "flex", flexDirection: "column", width: 590 }}>
              <div
                style={{
                  display: "flex",
                  alignSelf: "flex-start",
                  fontSize: 17,
                  fontWeight: 600,
                  color: BLUE,
                  background: "rgba(79, 159, 232, 0.14)",
                  border: "1px solid rgba(79, 159, 232, 0.30)",
                  borderRadius: 999,
                  padding: "6px 15px",
                }}
              >
                .edu verified
              </div>

              <div
                style={{
                  marginTop: 26,
                  fontSize: 64,
                  fontWeight: 600,
                  letterSpacing: "-0.035em",
                  lineHeight: 1.05,
                  color: INK,
                }}
              >
                You&apos;re not the only one.
              </div>

              <div style={{ marginTop: 22, fontSize: 24, lineHeight: 1.4, color: INK_MUTED }}>
                Post the real stuff. Find the students who get it.
              </div>
            </div>

            {/* Product, not decoration. The contribution graph is the thing people
                screenshot, so the site card shows the same object the profile card does. */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              {/* "Activity" is the app's own heading — see the h2 in profile/[username]/page.tsx. */}
              <div style={{ fontSize: 19, fontWeight: 600, color: INK }}>Activity</div>
              <div style={{ display: "flex", marginTop: 20, gap: GAP }}>
                {weeks.map((col, w) => (
                  <div key={w} style={{ display: "flex", flexDirection: "column", gap: GAP }}>
                    {col.map((lvl, d) => (
                      <div key={d} style={{ width: CELL, height: CELL, borderRadius: 4, background: HM[lvl] }} />
                    ))}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", marginTop: 18, alignItems: "center", gap: 7 }}>
                <div style={{ fontSize: 16, color: INK_FAINT }}>Less</div>
                {HM.map((c, i) => (
                  <div key={i} style={{ width: 14, height: 14, borderRadius: 3, background: c }} />
                ))}
                <div style={{ fontSize: 16, color: INK_FAINT }}>More</div>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              marginTop: 24,
              paddingTop: 24,
              borderTop: `1px solid ${BORDER}`,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <Wordmark size={26} />
              <div style={{ marginTop: 3, fontSize: 17, color: INK_MUTED }}>Verified students only.</div>
            </div>
            <div style={{ fontSize: 17, color: INK_FAINT }}>samehere.dev</div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: font },
  );
}
