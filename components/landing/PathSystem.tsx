"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

const STAGES = [
  {
    id: "studio",
    name: "Build",
    description: "Turn an experience gap into proof.",
    nextMove: "Ship one project you can defend.",
    modifier: "Focus mode",
    modifierDetail: "One task stays visible. Everything else waits.",
  },
  {
    id: "ops desk",
    name: "Apply",
    description: "Move the right applications forward.",
    nextMove: "Send one strong application.",
    modifier: "Network gap",
    modifierDetail: "Company helpers move forward when they can help.",
  },
  {
    id: "prep room",
    name: "Prepare",
    description: "Practice the interview in front of you.",
    nextMove: "Practice your opening answer.",
    modifier: "Interview focus",
    modifierDetail: "The next interview stays ahead of new listings.",
  },
] as const;

export default function PathSystem() {
  const reduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const active = STAGES[activeIndex];

  useEffect(() => {
    if (reduceMotion || paused) return;
    const timer = window.setTimeout(() => {
      setActiveIndex((current) => (current + 1) % STAGES.length);
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [activeIndex, paused, reduceMotion]);

  return (
    <section id="how" className="landing-path-system">
      <div className="landing-path-copy">
        <p>For students</p>
        <h2>One coach. Every stage.</h2>
        <p>
          samehere changes what comes first as your search changes. The path stays
          structured; only the priority moves.
        </p>
        <div className="landing-stage-compact">
          {STAGES.map((stage, index) => (
            <button
              key={stage.id}
              type="button"
              aria-pressed={index === activeIndex}
              onClick={() => setActiveIndex(index)}
              className={index === activeIndex ? "is-active" : ""}
            >
              <span aria-hidden className="landing-stage-selector-dot" />
              <strong>{stage.name}</strong>
              <span>{stage.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div
        className="landing-path-preview landing-xai-card-hover"
        aria-label="Example adaptive path"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        <div className="landing-xai-card-content">
          <header>
            <span>Your path</span>
            <span>{active.id}</span>
          </header>
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={active.id}
              className="landing-path-next"
              initial={
                reduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: 8, filter: "blur(4px)" }
              }
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={
                reduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: -6, filter: "blur(3px)" }
              }
              transition={{
                duration: reduceMotion ? 0.01 : 0.28,
                ease: [0.23, 1, 0.32, 1],
              }}
            >
              <span>Next move</span>
              <p>{active.nextMove}</p>
            </motion.div>
          </AnimatePresence>
          <div className="landing-path-track" aria-hidden>
            {STAGES.map((stage, index) => (
              <span
                key={stage.id}
                className={index === activeIndex ? "is-current" : ""}
              >
                {stage.name}
                {index === activeIndex ? (
                  <motion.span
                    layoutId="landing-path-stage"
                    className="landing-path-stage-line"
                    transition={{
                      duration: reduceMotion ? 0 : 0.3,
                      ease: [0.23, 1, 0.32, 1],
                    }}
                  />
                ) : null}
              </span>
            ))}
          </div>
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={`${active.id}-modifier`}
              className="landing-path-modifier"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0.01 : 0.2 }}
            >
              <span>{active.modifier}</span>
              {active.modifierDetail}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
