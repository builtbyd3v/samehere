import type { CSSProperties } from "react";
import { BLUE, CANVAS, INK } from "@/lib/og-tokens";

/** `same` ink + `here` blue — matches brand wordmark / LandingNav. */
export function OgWordmark({ size }: { size: number }) {
  return (
    <div style={{ display: "flex", fontSize: size, fontWeight: 600, letterSpacing: "-0.03em" }}>
      <div style={{ display: "flex", color: INK }}>same</div>
      <div style={{ display: "flex", color: BLUE }}>here</div>
    </div>
  );
}

/** Full-bleed x.ai-style canvas: near-black + soft blue ambient, no inset picture-frame. */
export function ogCanvasStyle(extra?: CSSProperties): CSSProperties {
  return {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    background: CANVAS,
    backgroundImage:
      "radial-gradient(ellipse 1100px 640px at 18% -8%, rgba(79, 159, 232, 0.22), transparent 62%), radial-gradient(ellipse 900px 520px at 92% 108%, rgba(79, 159, 232, 0.10), transparent 55%)",
    fontFamily: "Figtree",
    ...extra,
  };
}
