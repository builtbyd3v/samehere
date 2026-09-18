import { ImageResponse } from "next/og";
import { BLUE, BORDER, INK, INK_FAINT, INK_MUTED, POST } from "@/lib/og-tokens";
import {
  SITE_OG_ANNOUNCE,
  SITE_OG_DESCRIPTION,
  SITE_OG_HEADLINE,
  SITE_OG_TITLE,
} from "@/lib/og/copy";
import { loadOgFonts } from "@/lib/og/fonts";
import { OgWordmark, ogCanvasStyle } from "@/lib/og/mark";

// Site-wide OG card — what samehere.dev itself unfurls as.
//
// x.ai / premium language: full-bleed dark canvas, brand-first headline matching
// the landing hero, one product glimpse (a labeled example post). No inset
// "picture frame" card — that read as a generic SaaS unfurl.
//
// Like is deliberately absent (retired). Colours from lib/og-tokens.ts.

export const runtime = "nodejs";

export const alt = SITE_OG_TITLE;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const strokeProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IconSame({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...strokeProps} stroke={color} fill={color}>
      <circle cx="9" cy="8" r="3.6" />
      <path d="M2.5 20v-1a6.5 6.5 0 0 1 13 0v1Z" />
      <circle cx="17" cy="8.5" r="2.8" />
      <path d="M16 13.4A5.5 5.5 0 0 1 21.5 19v1" fill="none" />
    </svg>
  );
}

function IconComment({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...strokeProps} stroke={color}>
      <path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2Z" />
    </svg>
  );
}

function ExamplePost() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 420,
        background: POST,
        border: `1px solid ${BORDER}`,
        borderRadius: 16,
        padding: 28,
      }}
    >
      <div style={{ display: "flex", fontSize: 14, fontWeight: 600, letterSpacing: "0.04em", color: BLUE, textTransform: "uppercase" }}>
        Example · Feed
      </div>
      <div style={{ display: "flex", marginTop: 18, flexDirection: "column" }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: INK }}>Priya Shah</div>
        <div style={{ marginTop: 2, fontSize: 16, color: INK_FAINT }}>CS · senior</div>
      </div>
      <div style={{ marginTop: 18, fontSize: 20, lineHeight: 1.45, color: INK }}>
        Anyone else drawing the page table twice before it sticks?
      </div>
      <div style={{ display: "flex", marginTop: 22, alignItems: "center", gap: 18, color: INK_FAINT, fontSize: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: BLUE }}>
          <IconSame color={BLUE} />
          <div style={{ display: "flex" }}>3</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <IconComment color={INK_FAINT} />
          <div style={{ display: "flex" }}>2</div>
        </div>
      </div>
    </div>
  );
}

export default async function OgImage() {
  const fonts = await loadOgFonts();

  return new ImageResponse(
    (
      <div style={ogCanvasStyle({ padding: "56px 64px", justifyContent: "space-between" })}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexGrow: 1 }}>
          <div style={{ display: "flex", flexDirection: "column", width: 580 }}>
            <div style={{ display: "flex", fontSize: 18, fontWeight: 500, color: BLUE }}>{SITE_OG_ANNOUNCE}</div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                marginTop: 22,
                fontSize: 58,
                fontWeight: 500,
                letterSpacing: "-0.035em",
                lineHeight: 1.05,
                color: INK,
              }}
            >
              <div style={{ display: "flex" }}>{SITE_OG_HEADLINE[0]}</div>
              <div style={{ display: "flex" }}>{SITE_OG_HEADLINE[1]}</div>
            </div>

            <div style={{ marginTop: 24, fontSize: 22, lineHeight: 1.45, color: INK_MUTED, maxWidth: 520 }}>
              {SITE_OG_DESCRIPTION}
            </div>
          </div>

          <ExamplePost />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginTop: 28,
            paddingTop: 22,
            borderTop: `1px solid ${BORDER}`,
          }}
        >
          <OgWordmark size={28} />
          <div style={{ fontSize: 18, color: INK_FAINT }}>samehere.dev</div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
