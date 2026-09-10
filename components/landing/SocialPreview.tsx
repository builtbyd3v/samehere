"use client";

import { AnimatePresence, motion } from "motion/react";
import { MessageCircle } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { IconSame } from "@/components/icons";
import { usePrefersReducedMotion } from "@/lib/landing/usePrefersReducedMotion";

const TABS = [
  {
    id: "feed",
    name: "Feed",
    description: "Share what you are building, learning, or stuck on.",
  },
  {
    id: "messages",
    name: "Messages",
    description: "Talk with people on a similar path.",
  },
  {
    id: "portfolio",
    name: "Portfolio",
    description: "Keep a shareable project page at your username.",
  },
] as const;

const PANEL = {
  duration: 0.22,
  ease: [0.23, 1, 0.32, 1] as const,
};

function ReactionBar() {
  return (
    <div className="landing-reaction-bar" aria-label="Example reactions">
      <span>
        <IconSame on className="h-4 w-4" />
        3
      </span>
      <span>
        <MessageCircle size={16} strokeWidth={1.5} aria-hidden />
        2
      </span>
    </div>
  );
}

function FeedPanel() {
  return (
    <div className="landing-social-panel">
      <header>
        <span>Example</span>
        <span>Feed</span>
      </header>
      <article className="landing-social-post">
        <div className="landing-social-post-meta">
          <strong>Priya Shah</strong>
          <span>CS · senior</span>
        </div>
        <p>Anyone else drawing the page table twice before it sticks?</p>
        <span className="landing-label-chip">Learning</span>
        <ReactionBar />
      </article>
      <p className="landing-social-hint">You write the post. Labels are optional.</p>
    </div>
  );
}

function MessagesPanel() {
  return (
    <div className="landing-social-panel">
      <header>
        <span>Example</span>
        <span>Messages</span>
      </header>
      <div className="landing-social-thread">
        <p className="landing-social-bubble is-them">
          Same here — I hit that exact test flake. Want to compare notes?
        </p>
        <p className="landing-social-bubble is-you">
          Yes. I can send the failing spec after lab.
        </p>
      </div>
      <p className="landing-social-hint">You choose who hears from you.</p>
    </div>
  );
}

function PortfolioPanel() {
  return (
    <div className="landing-social-panel">
      <header>
        <span>Example</span>
        <span>Portfolio</span>
      </header>
      <article className="landing-social-post">
        <div className="landing-social-post-meta">
          <strong>Campus course planner</strong>
          <span>Draft</span>
        </div>
        <p>Ranks campus sections by time conflicts so you can lock a term before add/drop.</p>
        <span className="landing-label-chip">Project</span>
      </article>
      <p className="landing-social-hint">A repo link is a source. The story is yours.</p>
    </div>
  );
}

export default function SocialPreview() {
  const reduceMotion = usePrefersReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const active = TABS[activeIndex];

  const activate = useCallback((index: number, focus = false) => {
    setActiveIndex(index);
    if (focus) tabRefs.current[index]?.focus();
  }, []);

  function onTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = TABS.length - 1;
    let next: number | null = null;
    if (event.key === "ArrowRight") next = index === last ? 0 : index + 1;
    else if (event.key === "ArrowLeft") next = index === 0 ? last : index - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    if (next == null) return;
    event.preventDefault();
    activate(next, true);
  }

  return (
    <section id="community" className="landing-path-system">
      <div className="landing-path-copy">
        <p>Community</p>
        <h2>Talk it through.</h2>
        <p>
          Posts start the thread. Messages and profiles keep it human — you
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
                  transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
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

      <div
        className="landing-path-preview"
        aria-label="Example feed, messages, and portfolio"
      >
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={active.id}
            id={`landing-panel-${active.id}`}
            role="tabpanel"
            aria-labelledby={`landing-tab-${active.id}`}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, filter: "blur(3px)" }}
            transition={{
              duration: reduceMotion ? 0.01 : PANEL.duration,
              ease: PANEL.ease,
            }}
          >
            {active.id === "feed" ? <FeedPanel /> : null}
            {active.id === "messages" ? <MessagesPanel /> : null}
            {active.id === "portfolio" ? <PortfolioPanel /> : null}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
