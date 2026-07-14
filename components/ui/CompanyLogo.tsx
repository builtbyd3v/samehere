"use client";

import { useState } from "react";

type CompanyLogoProps = {
  name: string;
  logoUrl?: string | null;
  size?: "sm" | "md" | "lg";
};

const DIM: Record<NonNullable<CompanyLogoProps["size"]>, string> = {
  sm: "h-8 w-8 rounded-md p-1",
  md: "h-12 w-12 rounded-lg p-1.5",
  lg: "h-14 w-14 rounded-xl p-2",
};

const TEXT: Record<NonNullable<CompanyLogoProps["size"]>, string> = {
  sm: "text-xs",
  md: "text-base",
  lg: "text-xl",
};

// A logo whose average opaque-pixel luminance is above this reads as
// white/light and would vanish on the white tile, so its tile flips to dark.
const LIGHT_LUMA = 200;

export default function CompanyLogo({ name, logoUrl, size = "md" }: CompanyLogoProps) {
  const [needsDark, setNeedsDark] = useState(false);
  const [failed, setFailed] = useState(false);

  const box = `${DIM[size]} shrink-0 overflow-hidden border border-[var(--border)] flex items-center justify-center`;

  if (!logoUrl || failed) {
    return (
      <div className={`${box} ${TEXT[size]} bg-[var(--featured-surface)] font-semibold text-[var(--ink-muted)]`}>
        {name.charAt(0).toUpperCase()}
      </div>
    );
  }

  // Only logo.dev sends permissive CORS, so only those can be read from a
  // canvas without tainting it. Others (e.g. the simplify company cache on
  // storage.googleapis.com) load fine but stay on the default white tile.
  const measurable = logoUrl.includes("img.logo.dev");
  const bg = needsDark ? "bg-[var(--canvas)]" : "bg-white";

  // Sample the loaded logo once and flip the tile to dark if the mark itself is
  // light. Downscaled to <=64px for a cheap read. Any failure keeps white.
  function measure(e: React.SyntheticEvent<HTMLImageElement>) {
    try {
      const img = e.currentTarget;
      const w = Math.min(img.naturalWidth, 64);
      const h = Math.min(img.naturalHeight, 64);
      if (!w || !h) return;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, w, h);
      const { data } = ctx.getImageData(0, 0, w, h);
      let luma = 0;
      let opaque = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 24) continue; // skip transparent pixels
        luma += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        opaque++;
      }
      if (opaque > 0 && luma / opaque > LIGHT_LUMA) setNeedsDark(true);
    } catch {
      // Tainted canvas or read error: keep the default white tile.
    }
  }

  return (
    <div className={`${box} ${bg}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- third-party logo host, not worth next/image optimization */}
      <img
        src={logoUrl}
        alt=""
        crossOrigin={measurable ? "anonymous" : undefined}
        className="h-full w-full object-contain"
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        onLoad={measurable ? measure : undefined}
      />
    </div>
  );
}
