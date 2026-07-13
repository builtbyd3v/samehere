import { readFile } from "node:fs/promises";
import { ImageResponse } from "next/og";
import { BLUE, BORDER, CANVAS, CARD, FEATURED, INK, INK_FAINT, INK_MUTED, POST } from "@/lib/og-tokens";

// Site-wide OG card — what samehere.dev itself unfurls as.
//
// It shows the product, not a description of it: one real post card with the
// reactions the app actually has. The previous version drew a fabricated
// contribution heatmap under the heading "Activity", which is true on a profile
// card and a lie here — it was nobody's year of work.
//
// Like is deliberately absent. It has been retired; SameHere is now the native
// reaction, so the card should not advertise a button that no longer exists.
//
// Dark by default: an unfurl lives in Discord, Slack and Twitter, which are dark
// for most people, and a cream card in a dark feed reads as a blown-out
// rectangle. Colours come from lib/og-tokens.ts, which mirrors the `.dark` block
// in app/globals.css — Satori has no CSS variables, so the values must exist in TS.

export const runtime = "nodejs"; // reads the font files off disk

export const alt = "samehere: Find your people. Find your path.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The app is set in Figtree (app/layout.tsx). Satori ships no fonts and falls
// back to a generic sans, which renders 600-weight as something closer to 400.
// Resolved with `new URL(..., import.meta.url)`, which Next traces statically;
// `join(process.cwd(), ...)` is a runtime string and would be missing from the
// deployed bundle.
// The headline's accent words ("people.", "path.") borrow the landing hero's
// Fraunces italic treatment (components/landing/Hero.tsx) — a static italic
// instance ships here because Satori can misrender a variable-font TTF's
// italic axis.
const fonts = async () => {
  const [regular, semibold, frauncesItalic] = await Promise.all([
    readFile(new URL("./fonts/Figtree-Regular.ttf", import.meta.url)),
    readFile(new URL("./fonts/Figtree-SemiBold.ttf", import.meta.url)),
    readFile(new URL("./fonts/Fraunces-SemiBoldItalic.ttf", import.meta.url)),
  ]);
  return [
    { name: "Figtree", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Figtree", data: semibold, weight: 600 as const, style: "normal" as const },
    { name: "Fraunces", data: frauncesItalic, weight: 600 as const, style: "italic" as const },
  ];
};

// Reaction glyphs, traced from components/icons.tsx: soft fully-rounded strokes,
// and the fillable ones go solid when active. SameHere is the two-people mark.
const strokeProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IconSame({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...strokeProps} stroke={color} fill={color}>
      <circle cx="9" cy="8" r="3.6" />
      <path d="M2.5 20v-1a6.5 6.5 0 0 1 13 0v1Z" />
      <circle cx="17" cy="8.5" r="2.8" />
      <path d="M16 13.4A5.5 5.5 0 0 1 21.5 19v1" fill="none" />
    </svg>
  );
}

function IconComment({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...strokeProps} stroke={color}>
      <path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2Z" />
    </svg>
  );
}

// Four-point sparkle, echoing the AI-search affordance in HeroSearchDemo.
// Drawn as a path rather than a unicode glyph (✦) — Figtree has no glyph for
// it in Satori's renderer, which draws a missing-glyph box instead.
function IconSparkle({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={color}>
      <path d="M12 2c0 4.5 1.2 7.5 3 9.3S19.5 12 22 12c-4.5 0-7.5 1.2-9.3 3S12 19.5 12 22c0-4.5-1.2-7.5-3-9.3S4.5 12 2 12c4.5 0 7.5-1.2 9.3-3S12 4.5 12 2Z" />
    </svg>
  );
}

function IconRepost({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...strokeProps} stroke={color}>
      <path d="M17 2l4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="M7 22l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

/** The wordmark: `same` in ink, `here` in blue. Matches Navbar and LandingNav. */
function Wordmark({ size: s }: { size: number }) {
  return (
    <div style={{ display: "flex", fontSize: s, fontWeight: 600, letterSpacing: "-0.02em" }}>
      <div style={{ display: "flex", color: INK }}>same</div>
      <div style={{ display: "flex", color: BLUE }}>here</div>
    </div>
  );
}

function Reaction({ icon, count, active }: { icon: React.ReactNode; count: number; active?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 13px",
        borderRadius: 999,
        background: active ? FEATURED : "transparent",
        color: active ? BLUE : INK_FAINT,
        fontSize: 17,
        fontWeight: active ? 600 : 400,
      }}
    >
      {icon}
      <div style={{ display: "flex" }}>{count}</div>
    </div>
  );
}

function PostCard() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 440,
        background: POST,
        border: `1px solid ${BORDER}`,
        borderRadius: 20,
        padding: 26,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
        <div
          style={{
            display: "flex",
            width: 48,
            height: 48,
            borderRadius: "50%",
            border: `2px solid ${BORDER}`,
            background: CANVAS,
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            fontWeight: 600,
            color: INK_MUTED,
          }}
        >
          M
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: INK }}>Maya</div>
          <div style={{ marginTop: 1, fontSize: 16, color: INK_FAINT }}>@maya · Junior · Computer Science</div>
        </div>
      </div>

      <div style={{ marginTop: 20, fontSize: 21, lineHeight: 1.45, color: INK }}>
        Three hours on one problem set and I still have nothing. Does it click for anyone else, or is it just me?
      </div>

      <div style={{ display: "flex", marginTop: 22, alignItems: "center", gap: 6 }}>
        <Reaction icon={<IconSame color={BLUE} />} count={14} active />
        <Reaction icon={<IconComment color={INK_FAINT} />} count={6} />
        <Reaction icon={<IconRepost color={INK_FAINT} />} count={2} />
      </div>
    </div>
  );
}

export default async function OgImage() {
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
            <div style={{ display: "flex", flexDirection: "column", width: 550 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  alignSelf: "flex-start",
                  fontSize: 17,
                  fontWeight: 600,
                  color: BLUE,
                  background: FEATURED,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 999,
                  padding: "8px 18px",
                }}
              >
                <div style={{ display: "flex" }}>
                  <IconSparkle color={BLUE} />
                </div>
                <div style={{ display: "flex" }}>Describe who you&apos;re looking for</div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  marginTop: 26,
                  fontSize: 62,
                  fontWeight: 600,
                  letterSpacing: "-0.035em",
                  lineHeight: 1.05,
                  color: INK,
                }}
              >
                <div style={{ display: "flex" }}>
                  <div style={{ display: "flex" }}>Find your&nbsp;</div>
                  <div style={{ display: "flex", fontFamily: "Fraunces", fontStyle: "italic", color: BLUE }}>
                    people.
                  </div>
                </div>
                <div style={{ display: "flex" }}>
                  <div style={{ display: "flex" }}>Find your&nbsp;</div>
                  <div style={{ display: "flex", fontFamily: "Fraunces", fontStyle: "italic", color: BLUE }}>
                    path.
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 22, fontSize: 23, lineHeight: 1.4, color: INK_MUTED }}>
                One AI-native network for students. Post what&apos;s real, find who gets it.
              </div>
            </div>

            <PostCard />
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
              <div style={{ marginTop: 3, fontSize: 17, color: INK_MUTED }}>Built for students.</div>
            </div>
            <div style={{ fontSize: 17, color: INK_FAINT }}>samehere.dev</div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: font },
  );
}
