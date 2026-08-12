import { readFile } from "node:fs/promises";
import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { BLUE, BORDER, CANVAS, CARD, GOLD, GREEN, INK, INK_FAINT, INK_MUTED } from "@/lib/og-tokens";
import { dossierSeekingLine } from "@/lib/profile-dossier";

// Dynamic per-profile OG card — identity + target role, no social counts.
//
// IMPORTANT: this runs with NO user session (crawlers, link unfurls) — only the
// public anon key is available. `profiles` RLS requires auth.uid() is not null,
// so everything comes through the anon-granted SECURITY DEFINER RPC
// get_public_profile, which nulls a private account's fields itself.
//
// Dark by default: an unfurl sits in Discord, Slack and Twitter, which are dark
// for most people. A cream card in a dark feed reads as a blown-out rectangle.
// Colours come from lib/og-tokens.ts, which mirrors the `.dark` block in
// app/globals.css — Satori has no CSS variables, so the values must exist in TS.
//
// sharp is a direct dependency for exactly one reason: Satori decodes PNG and
// JPEG only, and avatars are uploaded as WebP, which it silently draws as
// nothing (an empty ring). Supabase's image transform would serve a PNG but is
// a paid add-on. We fetch, transcode, and inline as a data URI.

export const runtime = "nodejs";

export const alt = "samehere profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

const fonts = async () => {
  const [regular, semibold] = await Promise.all([
    readFile(new URL("../../../fonts/Figtree-Regular.ttf", import.meta.url)),
    readFile(new URL("../../../fonts/Figtree-SemiBold.ttf", import.meta.url)),
  ]);
  return [
    { name: "Figtree", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Figtree", data: semibold, weight: 600 as const, style: "normal" as const },
  ];
};

type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_pro: boolean;
  is_founder: boolean;
  is_campus_founder: boolean;
  is_private: boolean;
  year: string | null;
  major: string | null;
  school: string | null;
  goals: string | null;
  verified_student: boolean;
};

const YEAR_LABEL: Record<string, string> = {
  freshman: "Freshman",
  sophomore: "Sophomore",
  junior: "Junior",
  senior: "Senior",
  grad: "Grad student",
};

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
  const s = 112;
  return src ? (
    <img src={src} alt="" width={s} height={s} style={{ borderRadius: "50%", objectFit: "cover", border: `3px solid ${BORDER}` }} />
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

function Identity({ profile, avatar, seeking }: { profile: Profile; avatar: string | null; seeking: string | null }) {
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

      {seeking && (
        <div style={{ display: "flex", marginTop: 18, fontSize: 22, color: INK }}>
          {`Seeking ${seeking}`}
        </div>
      )}

      {meta.length > 0 && <div style={{ marginTop: 16, fontSize: 20, color: INK_FAINT }}>{meta}</div>}

      {profile.is_private && (
        <div style={{ marginTop: 18, fontSize: 20, color: INK_FAINT }}>This account is private.</div>
      )}
    </div>
  );
}

function Wordmark({ size: s }: { size: number }) {
  return (
    <div style={{ display: "flex", fontSize: s, fontWeight: 600, letterSpacing: "-0.02em" }}>
      <div style={{ display: "flex", color: INK }}>same</div>
      <div style={{ display: "flex", color: BLUE }}>here</div>
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
        <Wordmark size={24} />
        <div style={{ marginTop: 3, fontSize: 17, color: INK_MUTED }}>Built for students.</div>
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

  const font = await fonts();

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
            backgroundImage:
              "radial-gradient(ellipse 1000px 600px at 40% -10%, rgba(79, 159, 232, 0.28), transparent 70%)",
            color: INK,
            fontFamily: "Figtree",
          }}
        >
          <Wordmark size={60} />
          <div style={{ marginTop: 18, fontSize: 26, color: INK_MUTED }}>Built for students.</div>
        </div>
      ),
      { ...size, fonts: font },
    );
  }

  const avatar = await avatarDataUri(profile.avatar_url);
  const seeking = profile.is_private ? null : dossierSeekingLine({ goals: profile.goals, major: profile.major });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: CANVAS,
          backgroundImage:
            "radial-gradient(ellipse 900px 600px at 50% -10%, rgba(79, 159, 232, 0.16), transparent 70%)",
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
            backgroundImage:
              "radial-gradient(ellipse 1000px 500px at 30% -15%, rgba(79, 159, 232, 0.30), transparent 65%)",
            border: `1px solid ${BORDER}`,
            borderRadius: 28,
            padding: 44,
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexGrow: 1, alignItems: "center" }}>
            <Identity profile={profile} avatar={avatar} seeking={seeking} />
          </div>
          <Footer username={profile.username} />
        </div>
      </div>
    ),
    { ...size, fonts: font },
  );
}
