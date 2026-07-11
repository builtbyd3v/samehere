"use client";

import { useState } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from "motion/react";
import { IconSame } from "@/components/icons";
import { HERO_PEERS, type HeroPeer } from "@/lib/landing/demo-data";
import DemoAvatar from "./DemoAvatar";

// Live SameHere — the landing's signature interaction. Local state only;
// nothing is persisted, it's a demo of the product's core verb.
function SameHereLive({ initial }: { initial: number }) {
  const reduce = useReducedMotion();
  const [on, setOn] = useState(false);
  const [burst, setBurst] = useState(0);
  const count = initial + (on ? 1 : 0);
  // Spring impulse instead of a keyed keyframe restart — rapid taps retarget
  // the spring (carrying velocity) instead of snapping back to frame zero.
  const iconScale = useSpring(1, { stiffness: 550, damping: 18 });

  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? "Remove your same here" : "Say same here"}
      onClick={() => {
        if (!on) setBurst((b) => b + 1);
        if (!reduce) {
          iconScale.jump(on ? 0.9 : 1.3);
          iconScale.set(1);
        }
        setOn((v) => !v);
      }}
      className={`relative mt-2.5 flex items-center gap-1.5 text-[12px] font-medium transition-colors ${
        on ? "text-[var(--blue)]" : "text-[var(--ink-muted)] hover:text-[var(--blue)]"
      }`}
    >
      <motion.span className="inline-flex" style={{ scale: iconScale }}>
        <IconSame on={on} />
      </motion.span>
      <span className="same-tick inline-block tabular-nums" key={count}>
        {count}
      </span>
      <span>same here</span>
      {burst > 0 && (
        <span key={burst} aria-hidden className="same-burst pointer-events-none absolute left-1 top-1/2">
          <span />
          <span />
          <span />
        </span>
      )}
    </button>
  );
}

// Shared card visual — reused by the desktop scatter and the mobile stack.
function CardFace({ peer }: { peer: HeroPeer }) {
  return (
    <div className="cluster-card rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-raised)] p-3.5 shadow-paper">
      <div className="flex items-center gap-2.5">
        <DemoAvatar seed={peer.avatarSeed} name={peer.name} />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold leading-tight text-[var(--ink)]">{peer.name}</p>
          <p className="truncate text-[11px] leading-tight text-[var(--ink-muted)]">{peer.school}</p>
        </div>
      </div>
      <p className="mt-2.5 line-clamp-3 text-[13px] leading-[1.4] text-[var(--ink)]">{peer.line}</p>
      <SameHereLive initial={peer.same} />
    </div>
  );
}

// Desktop card: entrance (outer) → cursor parallax (mid) → idle float (css) → hover (card).
// Layers are separate elements so their transforms compose instead of fighting.
function ScatterCard({
  peer,
  i,
  mx,
  my,
}: {
  peer: HeroPeer;
  i: number;
  mx: MotionValue<number>;
  my: MotionValue<number>;
}) {
  const { pos, float } = peer;
  // nearer cards (higher z) parallax more → depth illusion
  const depth = pos.z / 40;
  // Single transform-string MotionValue (not x/y shorthands) so this is a
  // GPU-composited transform write, not a main-thread style recalc per frame.
  const t = useTransform([mx, my] as const, ([x, y]: number[]) =>
    `translate3d(${x * 30 * depth}px, ${y * 20 * depth}px, 0)`
  );

  return (
    // Base opacity/scale sit in inline style, not in the keyframe's `from` —
    // so the steady-state look is correct even with no animation running
    // (reduced motion, or CSS/JS unavailable). `cluster-enter` only layers a
    // translateY slide-in via `transform` on top.
    <div
      className="cluster-item cluster-enter absolute w-[200px]"
      style={{
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        zIndex: "var(--z)" as unknown as number,
        opacity: pos.op,
        scale: String(pos.scale),
        translate: "-50% -50%",
        ["--z" as string]: pos.z,
        ["--i" as string]: i,
      }}
    >
      <motion.div style={{ transform: t }}>
        <div
          className="cluster-float"
          style={{
            ["--fx" as string]: float.fx,
            ["--fy" as string]: float.fy,
            ["--fr" as string]: float.fr,
            ["--dur" as string]: `${float.dur}s`,
            ["--delay" as string]: `${float.delay}s`,
          }}
        >
          <CardFace peer={peer} />
        </div>
      </motion.div>
    </div>
  );
}

// Mobile: a tidy overlapping stack of three strong voices — no fragile % scatter.
const MOBILE = [
  { u: "mwebb", top: "4%", rot: "-4deg", z: 10 },
  { u: "devonc", top: "32%", rot: "3deg", z: 30 },
  { u: "omarh", top: "60%", rot: "-1.5deg", z: 20 },
] as const;

function MobileStack() {
  return (
    <div className="pointer-events-auto relative mx-auto h-[360px] w-full lg:hidden">
      {MOBILE.map((m, i) => {
        const peer = HERO_PEERS.find((p) => p.username === m.u);
        if (!peer) return null;
        return (
          <div
            key={m.u}
            className="cluster-item fade-rise absolute left-1/2 w-[240px] max-w-[86vw]"
            style={{
              top: m.top,
              zIndex: m.z,
              translate: "-50% 0",
              rotate: m.rot,
              ["--y" as string]: "22px",
              ["--delay" as string]: `${0.15 + i * 0.1}s`,
            }}
          >
            <CardFace peer={peer} />
          </div>
        );
      })}
    </div>
  );
}

export default function HeroCluster() {
  const reduce = useReducedMotion();
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const mx = useSpring(rawX, { stiffness: 55, damping: 18 });
  const my = useSpring(rawY, { stiffness: 55, damping: 18 });

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    rawX.set((e.clientX - (r.left + r.width / 2)) / r.width);
    rawY.set((e.clientY - (r.top + r.height / 2)) / r.height);
  }
  function reset() {
    rawX.set(0);
    rawY.set(0);
  }

  return (
    <div className="pointer-events-none relative mx-auto w-full max-w-[1040px]">
      {/* soft ambient bloom behind the cluster — warm depth, barely there */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[70%] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[80px]"
        style={{ background: "radial-gradient(closest-side, var(--accent-glow), transparent 75%)" }}
      />

      {/* desktop scatter with cursor parallax */}
      <div
        className="pointer-events-auto absolute inset-0 hidden lg:block"
        onMouseMove={reduce ? undefined : onMove}
        onMouseLeave={reset}
      >
        {HERO_PEERS.map((peer, i) => (
          <ScatterCard key={peer.username} peer={peer} i={i} mx={mx} my={my} />
        ))}
      </div>
      {/* desktop needs explicit height (children are absolute); mobile uses the stack's height */}
      <div className="hidden h-[46vh] max-h-[440px] min-h-[330px] lg:block" />

      {/* mobile stack */}
      <div className="lg:hidden">
        <MobileStack />
      </div>
    </div>
  );
}
