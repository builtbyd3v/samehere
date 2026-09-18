"use client";

import { AnimatePresence, motion } from "motion/react";
import { MessageCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { IconSame } from "@/components/icons";
import { reactionAfterSelect } from "@/lib/landing/scene-control";
import { usePrefersReducedMotion } from "@/lib/landing/usePrefersReducedMotion";
import { ghostCtaSm } from "./cta";
import ContextLabelBadge from "@/components/ui/ContextLabelBadge";
import { parseContextLabel } from "@/lib/context-label";

type PersonId = "maya" | "jordan" | "priya";

const PEOPLE = {
  maya: {
    id: "maya" as const,
    name: "Maya Chen",
    handle: "maya",
    year: "CS · junior",
    initials: "MC",
    hue: 210,
    openTo: "Looking for a study partner who likes calendars more than I do.",
    project: {
      title: "Campus course planner",
      blurb: "Ranks campus sections by time conflicts so you can lock a term before add/drop.",
    },
    activity: "Posted in Feed · 2h",
  },
  jordan: {
    id: "jordan" as const,
    name: "Jordan Hale",
    handle: "jordan",
    year: "CS · sophomore",
    initials: "JH",
    hue: 160,
    openTo: "Happy to compare notes on flaky tests.",
    project: {
      title: "Lab partner board",
      blurb: "A quiet board for finding someone to sit through the same recitation.",
    },
    activity: "Replied to Maya · 1h",
  },
  priya: {
    id: "priya" as const,
    name: "Priya Shah",
    handle: "priya",
    year: "CS · senior",
    initials: "PS",
    hue: 28,
    openTo: "Open to walk through systems homework after 7.",
    project: {
      title: "Cache visualizer",
      blurb: "Shows hit/miss on a tiny LRU so the midterm diagrams stop lying.",
    },
    activity: "Shared a write-up · 4h",
  },
} as const;

const POSTS = [
  {
    id: "maya-stuck",
    authorId: "maya" as const,
    label: "Stuck",
    body: "Rewrote the scheduler twice and the tests still fail on Fridays.",
    snippet: "src/schedule.ts · findGaps()",
    reply: {
      authorId: "jordan" as const,
      text: "Same here — I hit that flake after the Friday CI window. Want the spec?",
    },
  },
  {
    id: "jordan-building",
    authorId: "jordan" as const,
    label: "Building",
    body: "Shipped a matcher that pairs lab partners by overlapping free hours.",
    snippet: "samehere.dev/profile/jordan",
  },
] as const;

const PREVIEW = {
  id: "priya-learning",
  authorId: "priya" as const,
  label: "Learning",
  body: "Finally drew the page table by hand. The midterm makes sense now.",
} as const;

const LAST_STEP = 3;
const STEP_MS = 1800;

function Avatar({
  personId,
  size = 32,
}: {
  personId: PersonId;
  size?: number;
}) {
  const person = PEOPLE[personId];
  return (
    <span
      className="landing-scene-avatar"
      style={{
        width: size,
        height: size,
        background: `hsl(${person.hue} 28% 22%)`,
        color: `hsl(${person.hue} 62% 78%)`,
      }}
      aria-hidden
    >
      {person.initials}
    </span>
  );
}

export default function SocialScene() {
  const reduceMotion = usePrefersReducedMotion();
  const rootRef = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);
  const [offscreen, setOffscreen] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [controlled, setControlled] = useState(false);
  const [selectedId, setSelectedId] = useState<PersonId>("maya");
  const [reacted, setReacted] = useState(false);
  const displayStep = reduceMotion ? LAST_STEP : step;
  const complete = displayStep >= LAST_STEP;
  const paused = offscreen || userPaused;
  const showAck = reduceMotion || displayStep >= 2 || controlled;
  const autoReaction = reduceMotion || displayStep >= 1;
  const reactionOn = controlled ? reacted : autoReaction;
  const profileLive = reduceMotion || displayStep >= 3 || controlled;
  const selected = PEOPLE[selectedId];

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
      setOffscreen(Boolean(hidden));
    }

    const io = new IntersectionObserver(() => syncPause(), { threshold: 0.15 });
    io.observe(root);
    document.addEventListener("visibilitychange", syncPause);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", syncPause);
    };
  }, []);

  useEffect(() => {
    if (reduceMotion || paused || controlled || complete) return;
    const timer = window.setTimeout(() => {
      setStep((current) => Math.min(current + 1, LAST_STEP));
    }, STEP_MS);
    return () => window.clearTimeout(timer);
  }, [complete, controlled, paused, reduceMotion, step]);

  function selectPerson(id: PersonId) {
    setReacted(reactionAfterSelect(controlled, reacted, autoReaction));
    setControlled(true);
    setStep(LAST_STEP);
    setSelectedId(id);
  }

  function toggleReaction() {
    const current = controlled ? reacted : autoReaction;
    setControlled(true);
    setStep(LAST_STEP);
    setReacted(!current);
  }

  function replay() {
    setControlled(false);
    setSelectedId("maya");
    setReacted(false);
    setStep(0);
    setUserPaused(false);
  }

  return (
    <section
      ref={rootRef}
      className="landing-scene"
      data-paused={paused || undefined}
      data-live={profileLive || undefined}
      aria-label="Example feed and profile"
    >
      <div className="landing-scene-glow surface-grain" aria-hidden />
      <div className="landing-scene-stage">
        <div className="landing-scene-chrome">
          <span className="landing-scene-dots" aria-hidden>
            <i />
            <i />
            <i />
          </span>
          <span className="landing-scene-chrome-title">Feed</span>
          <span className="landing-scene-example">Example</span>
        </div>

        <div className="landing-scene-body">
          <div className="landing-scene-feed">
            {POSTS.map((post) => {
              const author = PEOPLE[post.authorId];
              const active = selectedId === post.authorId;
              const label = parseContextLabel(post.label);
              return (
                <article
                  key={post.id}
                  className="landing-scene-post"
                  data-active={active || undefined}
                  data-ack={"reply" in post && showAck ? "true" : undefined}
                >
                  <header className="landing-scene-post-head">
                    <button
                      type="button"
                      className="landing-scene-identity"
                      onClick={() => selectPerson(post.authorId)}
                    >
                      <Avatar personId={post.authorId} />
                      <span>
                        <strong>{author.name}</strong>
                        <span>{author.year}</span>
                      </span>
                    </button>
                    {label ? <ContextLabelBadge label={label} drawIn className="shrink-0" /> : null}
                  </header>
                  <p>{post.body}</p>
                  <p className="landing-scene-snippet">{post.snippet}</p>
                  {"reply" in post ? (
                    <div className="landing-scene-reply">
                      <button
                        type="button"
                        className="landing-scene-identity"
                        onClick={() => selectPerson(post.reply.authorId)}
                      >
                        <Avatar personId={post.reply.authorId} size={24} />
                        <strong>{PEOPLE[post.reply.authorId].name}</strong>
                      </button>
                      <p>{post.reply.text}</p>
                    </div>
                  ) : null}
                  {post.id === "maya-stuck" ? (
                    <div className="landing-scene-actions">
                      <button
                        type="button"
                        className="landing-scene-react"
                        aria-pressed={reactionOn}
                        aria-label={reactionOn ? "SameHere added" : "SameHere"}
                        onClick={toggleReaction}
                      >
                        <IconSame on={reactionOn} className="h-4 w-4" />
                        {reactionOn ? 4 : 3}
                      </button>
                      <span>
                        <MessageCircle size={16} strokeWidth={1.5} aria-hidden />
                        1
                      </span>
                    </div>
                  ) : (
                    <div className="landing-scene-actions" aria-label="Example reactions">
                      <span>
                        <IconSame className="h-4 w-4" />
                        2
                      </span>
                      <span>
                        <MessageCircle size={16} strokeWidth={1.5} aria-hidden />
                        1
                      </span>
                    </div>
                  )}
                </article>
              );
            })}

            <article
              className="landing-scene-post"
              data-compact=""
              data-active={selectedId === PREVIEW.authorId || undefined}
            >
              <button
                type="button"
                className="landing-scene-identity"
                onClick={() => selectPerson(PREVIEW.authorId)}
              >
                <Avatar personId={PREVIEW.authorId} />
                <span>
                  <strong>{PEOPLE[PREVIEW.authorId].name}</strong>
                  <span>{PREVIEW.body}</span>
                </span>
              </button>
              <ContextLabelBadge label="learning" drawIn className="shrink-0" />
            </article>
          </div>

          <aside className="landing-scene-profile" aria-label={`${selected.name} profile example`}>
            <AnimatePresence initial={false} mode="popLayout">
              <motion.div
                key={selected.id}
                className="landing-scene-profile-card"
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: reduceMotion ? 0 : 0.2, ease: [0.23, 1, 0.32, 1] }}
              >
                <Avatar personId={selected.id} size={40} />
                <p className="landing-scene-profile-name">{selected.name}</p>
                <p className="landing-scene-profile-meta">
                  @{selected.handle} · {selected.year}
                </p>
                <p className="landing-scene-open">{selected.openTo}</p>
                <div className="landing-scene-project">
                  <span>Project</span>
                  <strong>{selected.project.title}</strong>
                  <p>{selected.project.blurb}</p>
                </div>
                <p className="landing-scene-activity">{selected.activity}</p>
              </motion.div>
            </AnimatePresence>
          </aside>
        </div>
      </div>

      <div className="landing-preview-row">
        <p className="landing-preview-note">Example · nothing is posted</p>
        {!reduceMotion && complete ? (
          <button type="button" className={ghostCtaSm} onClick={replay}>
            Replay
          </button>
        ) : !reduceMotion ? (
          <button
            type="button"
            className={ghostCtaSm}
            onClick={() => setUserPaused((current) => !current)}
          >
            {userPaused || offscreen ? "Resume" : "Pause"}
          </button>
        ) : null}
      </div>
    </section>
  );
}
