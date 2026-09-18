import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { BORDER, INK, INK_FAINT, INK_MUTED, POST } from "@/lib/og-tokens";
import { loadOgFonts } from "@/lib/og/fonts";
import { OgWordmark, ogCanvasStyle } from "@/lib/og/mark";

// Per-post OG card — shared post links used to fall back to the site-wide card,
// which hid the author's words. Same anon-RPC privacy as generateMetadata:
// missing / hidden / private-author posts all render the brand fallback.

export const runtime = "nodejs";

export const alt = "samehere post";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

type PublicPost = {
  id: string;
  content: string;
  created_at: string;
  author_username: string;
  author_display_name: string | null;
  author_avatar_url: string | null;
};

function anonSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function avatarDataUri(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const png = await sharp(buf).resize(160, 160, { fit: "cover" }).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

function BrandFallback() {
  return (
    <div style={ogCanvasStyle({ justifyContent: "center", padding: 80 })}>
      <OgWordmark size={64} />
      <div style={{ marginTop: 18, fontSize: 26, color: INK_MUTED }}>Built for students.</div>
    </div>
  );
}

export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fonts = await loadOgFonts();

  const { data } = await anonSupabase().rpc("get_public_post", { p_id: id });
  const post = ((data as PublicPost[] | null) ?? [])[0] ?? null;

  if (!post) {
    return new ImageResponse(<BrandFallback />, { ...size, fonts });
  }

  const name = post.author_display_name ?? post.author_username;
  const avatar = await avatarDataUri(post.author_avatar_url);
  const body = clip(post.content, 220);
  const letter = name.charAt(0).toUpperCase();

  return new ImageResponse(
    (
      <div style={ogCanvasStyle({ padding: "56px 64px", justifyContent: "space-between" })}>
        <div style={{ display: "flex", fontSize: 16, fontWeight: 600, letterSpacing: "0.06em", color: INK_FAINT, textTransform: "uppercase" }}>
          Post on samehere
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            marginTop: 28,
            padding: 36,
            background: POST,
            border: `1px solid ${BORDER}`,
            borderRadius: 20,
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {avatar ? (
              <img
                src={avatar}
                width={72}
                height={72}
                style={{ borderRadius: "50%", objectFit: "cover", border: `2px solid ${BORDER}` }}
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  border: `2px solid ${BORDER}`,
                  background: "#161616",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 28,
                  fontWeight: 600,
                  color: INK_MUTED,
                }}
              >
                {letter}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 28, fontWeight: 600, color: INK }}>{name}</div>
              <div style={{ marginTop: 2, fontSize: 20, color: INK_MUTED }}>{`@${post.author_username}`}</div>
            </div>
          </div>

          <div style={{ marginTop: 28, fontSize: 34, fontWeight: 500, lineHeight: 1.35, letterSpacing: "-0.02em", color: INK }}>
            {body}
          </div>
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
          <OgWordmark size={26} />
          <div style={{ fontSize: 17, color: INK_FAINT }}>samehere.dev</div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
