"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "motion/react";
import { IconSame } from "@/components/icons";
import DemoAvatar from "./DemoAvatar";
import AiTag from "./AiTag";
import { HERO_PEERS } from "@/lib/landing/demo-data";

// Column post cards — reuses the hero-peer identities/lines (already written
// as real-feeling, vulnerable student posts) as the "wall of the feed" feed.
const COL_A = HERO_PEERS.filter((_, i) => i % 3 === 0);
const COL_B = HERO_PEERS.filter((_, i) => i % 3 === 1);
const COL_C = HERO_PEERS.filter((_, i) => i % 3 === 2);

function PostCard({ peer, icebreaker }: { peer: (typeof HERO_PEERS)[number]; icebreaker?: boolean }) {
  return (
    <div className="match-card mb-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-4 shadow-paper">
      <div className="flex items-center gap-2.5">
        <DemoAvatar seed={peer.avatarSeed} name={peer.name} />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold leading-tight text-[var(--ink)]">{peer.name}</p>
          <p className="truncate text-[11px] leading-tight text-[var(--ink-muted)]">{peer.school}</p>
        </div>
      </div>
      <p className="mt-2.5 line-clamp-3 text-[13px] leading-[1.45] text-[var(--ink)]">{peer.line}</p>
      <p className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-[var(--ink-faint)]">
        <IconSame className="h-3.5 w-3.5" />
        {peer.same} same here
      </p>
      {icebreaker && (
        <div className="mt-2.5">
          <AiTag>Icebreaker</AiTag>
          <p className="mt-1.5 text-[12px] leading-[1.4] text-[var(--ink-muted)]">
            &ldquo;Same here, want to grab lunch sometime?&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}

// A DM thread snippet — the same wall doubles as proof that a same-here turns
// into an actual conversation, not just a reaction count.
function DmMomentCard() {
  const peer = HERO_PEERS.find((p) => p.username === "omarh")!;
  return (
    <div className="match-card mb-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-4 shadow-paper">
      <div className="flex items-center gap-2.5">
        <DemoAvatar seed={peer.avatarSeed} name={peer.name} />
        <p className="text-[13px] font-semibold leading-tight text-[var(--ink)]">{peer.name}</p>
        <span className="ml-auto text-[10px] text-[var(--ink-faint)]">DM</span>
      </div>
      <div className="mt-3 space-y-1.5">
        <p className="max-w-[85%] rounded-2xl rounded-bl-sm bg-[var(--featured-surface)] px-3 py-1.5 text-[12px] text-[var(--ink)]">
          same here lol. lunch friday?
        </p>
        <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-[var(--blue)] px-3 py-1.5 text-[12px] text-white">
          yes please, I&apos;m so tired of eating alone
        </p>
      </div>
    </div>
  );
}

function Column({
  peers,
  speed,
  progress,
  leadCard,
}: {
  peers: typeof HERO_PEERS;
  speed: number;
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
  leadCard?: React.ReactNode;
}) {
  const y = useTransform(progress, [0, 1], [0, -speed]);
  return (
    <motion.div style={{ y }} className="flex flex-col">
      {leadCard}
      {[...peers, ...peers].map((peer, i) => (
        <PostCard key={`${peer.username}-${i}`} peer={peer} icebreaker={i === 0 && !leadCard} />
      ))}
    </motion.div>
  );
}

// The two overlay lines are structurally mutually exclusive: only one is ever
// mounted at a time (AnimatePresence unmounts the other), so there is no
// scroll position where both can render simultaneously — a discrete swap
// driven by a hysteresis threshold on scroll progress, not a continuous
// scroll-scrubbed opacity crossfade (which left a scroll-position window where
// both lines rendered partially visible and stacked).
function useOverlayText() {
  const [active, setActive] = useState<1 | 2>(1);
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (v > 0.55) setActive(2);
    else if (v < 0.45) setActive(1);
  });

  return { ref, scrollYProgress, active };
}

function ScrubbedWall() {
  const { ref, scrollYProgress, active } = useOverlayText();

  return (
    <section ref={ref} id="how" className="relative h-[240vh] scroll-mt-[5.5rem]">
      <div className="sticky top-0 flex h-[100dvh] items-center overflow-hidden">
        <div className="pointer-events-none absolute inset-0 grid grid-cols-3 gap-4 px-4 opacity-70 sm:gap-5 sm:px-8 md:opacity-90">
          <Column peers={COL_A} speed={260} progress={scrollYProgress} />
          <Column peers={COL_B} speed={420} progress={scrollYProgress} leadCard={<DmMomentCard />} />
          <Column peers={COL_C} speed={190} progress={scrollYProgress} />
        </div>

        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[var(--canvas)] via-[var(--canvas)]/55 to-[var(--canvas)]" />

        <div className="relative z-10 mx-auto w-full max-w-[700px] px-5 text-center">
          <AnimatePresence mode="wait">
            {active === 1 ? (
              <motion.p
                key="line1"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="text-balance text-[32px] font-semibold leading-[1.15] tracking-[-0.03em] sm:text-[44px]"
              >
                A real feed. <span className="font-display italic text-[var(--blue)]">Real</span> students.
              </motion.p>
            ) : (
              <motion.p
                key="line2"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="inline-flex items-center justify-center gap-3 text-balance text-[30px] font-semibold leading-[1.15] tracking-[-0.03em] sm:text-[42px]"
              >
                <motion.span
                  initial={{ scale: 0.5 }}
                  animate={{ scale: [0.5, 1.35, 1] }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="inline-flex text-[var(--blue)]"
                >
                  <IconSame on className="h-8 w-8 sm:h-10 sm:w-10" />
                </motion.span>
                Say <span className="font-display italic text-[var(--blue)]">same here</span>.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

function StaticWall() {
  const peers = HERO_PEERS.slice(0, 6);
  return (
    <section id="how" className="scroll-mt-[5.5rem] mx-auto max-w-[1200px] px-5 py-20 text-center">
      <p className="mx-auto max-w-[600px] text-balance text-[32px] font-semibold leading-[1.15] tracking-[-0.03em] sm:text-[44px]">
        A real feed. <span className="font-display italic text-[var(--blue)]">Real</span> students.{" "}
        <span className="inline-flex items-center gap-2 align-middle">
          <IconSame on className="h-8 w-8 text-[var(--blue)]" />
          Say <span className="font-display italic text-[var(--blue)]">same here</span>.
        </span>
      </p>
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DmMomentCard />
        {peers.map((peer, i) => (
          <PostCard key={peer.username} peer={peer} icebreaker={i === 0} />
        ))}
      </div>
    </section>
  );
}

export default function ProofWall() {
  const reduce = useReducedMotion();
  return reduce ? <StaticWall /> : <ScrubbedWall />;
}
