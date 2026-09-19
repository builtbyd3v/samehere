"use client";

import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { IconComment, IconRepost, IconSame } from "@/components/icons";
import Avatar from "@/components/ui/Avatar";
import ContextLabelBadge from "@/components/ui/ContextLabelBadge";
import { usePrefersReducedMotion } from "@/lib/landing/usePrefersReducedMotion";

const TABS = [
  {
    id: "feed",
    name: "Feed",
    description: "Share what you are building, learning, or stuck on.",
    last: 2,
  },
  {
    id: "messages",
    name: "Messages",
    description: "Talk with people on a similar path.",
    last: 1,
  },
  {
    id: "portfolio",
    name: "Portfolio",
    description: "Keep a shareable project page at your username.",
    last: 2,
  },
] as const;

const STEP_MS = 1100;
const EASE = [0.16, 1, 0.3, 1] as const;

function FeedPanel({ step }: { step: number }) {
  return (
    <div className="landing-social-panel">
      <article className="card-raised p-4">
        <div className="flex gap-3">
          <Avatar seed="priya" name="Priya Shah" className="h-10 w-10 shrink-0 rounded-full border border-[var(--border)] text-sm" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-[var(--ink)]">Priya Shah</p>
                <p className="mt-0.5 text-[12.5px] text-[var(--ink-faint)]">
                  @priya, Georgia Tech
                  <span className="mx-1">·</span>
                  4h
                </p>
              </div>
              <ContextLabelBadge label="learning" drawIn className="ml-auto shrink-0" />
            </div>
            <p className="mt-2.5 text-[15px] leading-[1.5] text-[var(--ink)]">
              Anyone else drawing the page table twice before it sticks?
            </p>
          </div>
        </div>
        <div className="mt-1 flex items-center gap-1 text-[13px] font-medium text-[var(--ink-muted)]">
          <span className={`landing-scene-react ${step >= 1 ? "is-on" : ""}`}>
            <IconSame on={step >= 1} className="h-5 w-5" />
            {step >= 1 ? 4 : 3}
          </span>
          <span className="landing-scene-react">
            <IconComment />
            2
          </span>
          <span className="landing-scene-react">
            <IconRepost />
            0
          </span>
        </div>
      </article>

      <article
        className={`card-raised p-4${step >= 2 ? " landing-beat" : " landing-held"}`}
        aria-hidden={step >= 2 ? undefined : true}
      >
          <div className="flex gap-3">
            <Avatar seed="maya" name="Maya Chen" className="h-10 w-10 shrink-0 rounded-full border border-[var(--border)] text-sm" />
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--ink)]">Maya Chen</p>
                  <p className="mt-0.5 text-[12.5px] text-[var(--ink-faint)]">
                    @maya, Georgia Tech
                    <span className="mx-1">·</span>
                    2h
                  </p>
                </div>
                <ContextLabelBadge label="stuck" drawIn className="ml-auto shrink-0" />
              </div>
              <p className="mt-2.5 text-[15px] leading-[1.5] text-[var(--ink)]">
                Rewrote the scheduler twice and the tests still fail on Fridays.
              </p>
            </div>
          </div>
        </article>
    </div>
  );
}

function MessagesPanel({ step }: { step: number }) {
  return (
    <div className="landing-social-panel">
      <div className="landing-social-thread">
        <div className="flex items-end gap-2">
          <Avatar seed="jordan" name="Jordan Hale" className="h-8 w-8 shrink-0 rounded-full border border-[var(--border)] text-xs" />
          <p className="max-w-[28rem] rounded-2xl rounded-bl-md border border-[var(--border)] bg-[var(--surface-post)] px-3.5 py-2.5 text-[15px] leading-[1.45] text-[var(--ink)]">
            Same here. I hit that exact test flake. Want to compare notes?
          </p>
        </div>
        <p
          className={`${step >= 1 ? "landing-beat" : "landing-held"} max-w-[28rem] justify-self-end rounded-2xl rounded-br-md bg-[var(--ink)] px-3.5 py-2.5 text-[15px] leading-[1.45] text-[var(--canvas)]`}
          aria-hidden={step >= 1 ? undefined : true}
        >
            Yes. I can send the failing spec after lab.
          </p>
      </div>
    </div>
  );
}

function PortfolioPanel({ step }: { step: number }) {
  return (
    <div className="landing-social-panel">
      <article className="card-raised landing-scan p-4 sm:p-5" data-scan={step >= 2 ? "true" : undefined}>
        <h3 className="text-[18px] font-semibold tracking-[-0.02em] text-[var(--ink)]">Campus course planner</h3>
        <p
          className={`${step >= 1 ? "landing-beat" : "landing-held"} mt-2 text-sm leading-6 text-[var(--ink-muted)]`}
          aria-hidden={step >= 1 ? undefined : true}
        >
          Ranks campus sections by time conflicts so you can lock a term before add/drop.
        </p>
        <div className={step >= 2 ? undefined : "landing-held"} aria-hidden={step >= 2 ? undefined : true}>
          <p className={`${step >= 2 ? "landing-beat" : ""} mt-2 text-sm text-[var(--ink)]`}>
            <span className="text-[var(--ink-muted)]">Role </span>
            Scheduler for my lab section
          </p>
          <p className={`${step >= 2 ? "landing-beat" : ""} mt-3 text-[12px] font-medium tracking-[0.01em] text-[var(--ink-muted)]`}>
            TypeScript · Next.js
          </p>
        </div>
      </article>
    </div>
  );
}

export default function SocialPreview() {
  const reduceMotion = usePrefersReducedMotion();
  const rootRef = useRef<HTMLElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const active = TABS[activeIndex];
  const last = active.last;
  const displayStep = reduceMotion ? last : step;
  const complete = displayStep >= last;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    function syncPause() {
      const bounds = root?.getBoundingClientRect();
      const hidden =
        document.visibilityState === "hidden" ||
        !bounds ||
        bounds.bottom < 0 ||
        bounds.top > window.innerHeight;
      setPaused(Boolean(hidden));
    }

    const io = new IntersectionObserver(() => syncPause(), { threshold: 0.2 });
    io.observe(root);
    document.addEventListener("visibilitychange", syncPause);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", syncPause);
    };
  }, []);

  useEffect(() => {
    if (reduceMotion || paused || complete) return;
    const timer = window.setTimeout(() => {
      setStep((current) => Math.min(current + 1, last));
    }, STEP_MS);
    return () => window.clearTimeout(timer);
  }, [complete, last, paused, reduceMotion, step]);

  const activate = useCallback((index: number, focus = false) => {
    setActiveIndex(index);
    setStep(0);
    if (focus) tabRefs.current[index]?.focus();
  }, []);

  function onTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const end = TABS.length - 1;
    let next: number | null = null;
    if (event.key === "ArrowRight") next = index === end ? 0 : index + 1;
    else if (event.key === "ArrowLeft") next = index === 0 ? end : index - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = end;
    if (next == null) return;
    event.preventDefault();
    activate(next, true);
  }

  return (
    <section ref={rootRef} id="community" className="landing-path-system reveal-view" data-paused={paused || undefined}>
      <div className="landing-path-copy">
        <p>Community</p>
        <h2>Talk it through.</h2>
        <p>
          Posts start the thread. Messages and profiles keep it human. You
          choose who hears from you.
        </p>
        <div className="landing-segment" role="tablist" aria-label="Product areas">
          {TABS.map((tab, index) => (
            <button
              key={tab.id}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              tabIndex={index === activeIndex ? 0 : -1}
              id={`landing-tab-${tab.id}`}
              aria-controls={`landing-panel-${tab.id}`}
              onClick={() => activate(index)}
              onKeyDown={(event) => onTabKeyDown(event, index)}
            >
              {index === activeIndex && !reduceMotion ? (
                <motion.span
                  layoutId="landing-segment-thumb"
                  className="landing-segment-thumb"
                  transition={{ duration: 0.28, ease: EASE }}
                />
              ) : index === activeIndex ? (
                <span className="landing-segment-thumb" />
              ) : null}
              <span className="landing-segment-label">{tab.name}</span>
            </button>
          ))}
        </div>
        <p className="landing-segment-desc">{active.description}</p>
      </div>

      <div className="landing-path-preview" aria-label="Example feed, messages, and portfolio">
        <div className="landing-reserve">
          {TABS.map((tab, index) => {
            const on = index === activeIndex;
            const panelStep = on ? displayStep : tab.last;
            return (
              <div
                key={tab.id}
                id={on ? `landing-panel-${tab.id}` : undefined}
                role={on ? "tabpanel" : undefined}
                aria-labelledby={on ? `landing-tab-${tab.id}` : undefined}
                className={on ? undefined : "landing-held"}
                aria-hidden={on ? undefined : true}
              >
                {tab.id === "feed" ? <FeedPanel step={panelStep} /> : null}
                {tab.id === "messages" ? <MessagesPanel step={panelStep} /> : null}
                {tab.id === "portfolio" ? <PortfolioPanel step={panelStep} /> : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
