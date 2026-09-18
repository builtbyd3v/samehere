"use client";

import { AnimatePresence, motion } from "motion/react";
import { House, RotateCcw, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { IconBell, IconComment, IconCompose, IconMail, IconRepost, IconSame, IconSearch } from "@/components/icons";
import Avatar from "@/components/ui/Avatar";
import ContextLabelBadge from "@/components/ui/ContextLabelBadge";
import { reactionAfterSelect } from "@/lib/landing/scene-control";
import { usePrefersReducedMotion } from "@/lib/landing/usePrefersReducedMotion";
import type { ContextLabel } from "@/lib/context-label";
type PersonId = "maya" | "jordan" | "priya";

const PEOPLE = {
  maya: {
    id: "maya" as const,
    name: "Maya Chen",
    handle: "maya",
    school: "Georgia Tech",
    year: "Junior, CS",
    posts: 14,
    followers: 37,
    following: 29,
    openTo: "Open to collaborate",
    project: {
      title: "Campus course planner",
      role: "Scheduler for my lab section",
      summary: "Ranks campus sections by time conflicts so you can lock a term before add/drop.",
      stack: "TypeScript · Next.js",
    },
  },
  jordan: {
    id: "jordan" as const,
    name: "Jordan Hale",
    handle: "jordan",
    school: "Georgia Tech",
    year: "Sophomore, CS",
    posts: 9,
    followers: 22,
    following: 41,
    openTo: "Study together",
    project: {
      title: "Lab partner board",
      role: "Matching for one recitation",
      summary: "A quiet board for finding someone to sit through the same lab.",
      stack: "TypeScript",
    },
  },
  priya: {
    id: "priya" as const,
    name: "Priya Shah",
    handle: "priya",
    school: "Georgia Tech",
    year: "Senior, CS",
    posts: 31,
    followers: 86,
    following: 54,
    openTo: "Feedback",
    project: {
      title: "Cache visualizer",
      role: "Diagrams for the systems midterm",
      summary: "Shows hit and miss on a tiny LRU so the page-table drawings stop lying.",
      stack: "TypeScript",
    },
  },
} as const;

const POSTS = [
  {
    id: "maya-stuck",
    authorId: "maya" as const,
    label: "stuck" as ContextLabel,
    body: "Rewrote the scheduler twice and the tests still fail on Fridays.",
    time: "2h",
    samehere: 3,
    comments: 1,
    reposts: 0,
    reply: {
      authorId: "jordan" as const,
      text: "Same here. I hit that flake after the Friday CI window. Want the spec?",
    },
  },
  {
    id: "jordan-building",
    authorId: "jordan" as const,
    label: "building" as ContextLabel,
    body: "Shipped a matcher that pairs lab partners by overlapping free hours.",
    time: "1h",
    samehere: 2,
    comments: 1,
    reposts: 1,
  },
] as const;

const LAST_STEP = 4;
const STEP_MS = 1400;

const NAV = [
  { label: "Feed", icon: <House size={18} strokeWidth={1.5} aria-hidden />, active: true },
  { label: "Messages", icon: <IconMail />, active: false },
  { label: "Profile", icon: <User size={18} strokeWidth={1.5} aria-hidden />, active: false },
  { label: "Search", icon: <IconSearch />, active: false },
  { label: "Notifications", icon: <IconBell />, active: false },
] as const;

function PersonButton({
  personId,
  onSelect,
  size = "md",
}: {
  personId: PersonId;
  onSelect: (id: PersonId) => void;
  size?: "sm" | "md";
}) {
  const person = PEOPLE[personId];
  const dim = size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";
  return (
    <button type="button" className="shrink-0 rounded-full" onClick={() => onSelect(personId)} aria-label={person.name}>
      <Avatar
        seed={person.handle}
        name={person.name}
        className={`${dim} rounded-full border border-[var(--border)]`}
      />
    </button>
  );
}

export default function SocialScene() {
  const reduceMotion = usePrefersReducedMotion();
  const rootRef = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);
  const [offscreen, setOffscreen] = useState(false);
  const [controlled, setControlled] = useState(false);
  const [selectedId, setSelectedId] = useState<PersonId>("maya");
  const [reacted, setReacted] = useState(false);
  const displayStep = reduceMotion ? LAST_STEP : step;
  const complete = displayStep >= LAST_STEP;
  const paused = offscreen;
  const showAck = reduceMotion || displayStep >= 2 || controlled;
  const showSecond = reduceMotion || displayStep >= 3 || controlled;
  const autoReaction = reduceMotion || displayStep >= 1;
  const reactionOn = controlled ? reacted : autoReaction;
  const profileLive = reduceMotion || displayStep >= LAST_STEP || controlled;
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
  }

  return (
    <section
      ref={rootRef}
      className="landing-scene"
      data-paused={paused || undefined}
      data-live={profileLive || undefined}
      aria-label="Example feed and profile"
    >
      <div className="landing-scene-stage">
        <div className="landing-scene-body">
          <nav className="landing-scene-nav" aria-hidden>
            {NAV.map((item) => (
              <span key={item.label} className="landing-scene-nav-item" data-active={item.active || undefined}>
                {item.icon}
                {item.label}
              </span>
            ))}
          </nav>

          <div className="landing-scene-feed">
            <div className="card-raised flex h-12 items-center gap-3 px-3 text-left" aria-hidden>
              <span className="h-8 w-8 shrink-0 rounded-full border border-[var(--border)] bg-[var(--featured-surface)]" />
              <span className="flex-1 text-[15px] text-[var(--ink-faint)]">Share what you&apos;re building…</span>
              <span className="shrink-0 text-[var(--ink-muted)]">
                <IconCompose />
              </span>
            </div>

            {POSTS.map((post) => {
              if (post.id === "jordan-building" && !showSecond) return null;
              const author = PEOPLE[post.authorId];
              const active = selectedId === post.authorId;
              const sameCount = post.id === "maya-stuck" ? (reactionOn ? post.samehere + 1 : post.samehere) : post.samehere;
              return (
                <article
                  key={post.id}
                  className="card-raised landing-beat p-4"
                  data-active={active || undefined}
                  data-ack={"reply" in post && showAck ? "true" : undefined}
                >
                  <div className="flex gap-3">
                    <PersonButton personId={post.authorId} onSelect={selectPerson} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <button type="button" className="min-w-0 text-left" onClick={() => selectPerson(post.authorId)}>
                          <span className="block font-semibold text-[var(--ink)]">{author.name}</span>
                          <span className="mt-0.5 block text-[12.5px] text-[var(--ink-faint)]">
                            @{author.handle}, {author.school}
                            <span className="mx-1">·</span>
                            {post.time}
                          </span>
                        </button>
                        <ContextLabelBadge label={post.label} drawIn className="ml-auto shrink-0" />
                      </div>
                      <p className="mt-2.5 max-w-[65ch] text-[15px] leading-[1.5] text-[var(--ink)]">{post.body}</p>
                    </div>
                  </div>

                  {"reply" in post && showAck ? (
                    <div className="landing-beat mt-3 flex gap-3 border-t border-[var(--border)] pt-3">
                      <PersonButton personId={post.reply.authorId} onSelect={selectPerson} size="sm" />
                      <div className="min-w-0 flex-1">
                        <button type="button" className="text-left text-sm" onClick={() => selectPerson(post.reply.authorId)}>
                          <span className="font-medium text-[var(--ink)]">{PEOPLE[post.reply.authorId].name}</span>
                          <span className="ml-1.5 text-[var(--ink-muted)]">@{PEOPLE[post.reply.authorId].handle}</span>
                        </button>
                        <p className="mt-0.5 text-[15px] leading-[1.55] text-[var(--ink)]">{post.reply.text}</p>
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-1 flex items-center gap-1">
                    {post.id === "maya-stuck" ? (
                      <button
                        type="button"
                        className={`landing-scene-react ${reactionOn ? "is-on" : ""}`}
                        aria-pressed={reactionOn}
                        aria-label={reactionOn ? "SameHere added" : "SameHere"}
                        onClick={toggleReaction}
                      >
                        <IconSame on={reactionOn} className="h-5 w-5" />
                        {sameCount}
                      </button>
                    ) : (
                      <span className="landing-scene-react" aria-label="Example reactions">
                        <IconSame className="h-5 w-5" />
                        {sameCount}
                      </span>
                    )}
                    <span className="landing-scene-react">
                      <IconComment />
                      {post.comments}
                    </span>
                    <span className="landing-scene-react">
                      <IconRepost />
                      {post.reposts}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>

          <aside className="landing-scene-profile" aria-label={profileLive ? `${selected.name} profile example` : "Profile example"}>
            {profileLive ? (
              <AnimatePresence initial={false} mode="popLayout">
                <motion.div
                  key={selected.id}
                  className="card-raised landing-beat p-4"
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                  transition={{ duration: reduceMotion ? 0 : 0.32, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Avatar
                    seed={selected.handle}
                    name={selected.name}
                    className="h-14 w-14 rounded-full border-2 border-[var(--surface-raised)] text-lg"
                  />
                  <p className="landing-scene-profile-name">{selected.name}</p>
                  <p className="landing-scene-profile-meta">@{selected.handle}</p>
                  <p className="landing-scene-profile-meta">
                    {selected.school}
                    <span className="mx-1">·</span>
                    {selected.year}
                  </p>
                  <p className="landing-scene-stats">
                    <span>
                      <b>{selected.posts}</b> posts
                    </span>
                    <span>
                      <b>{selected.followers}</b> followers
                    </span>
                    <span>
                      <b>{selected.following}</b> following
                    </span>
                  </p>
                  <p className="landing-scene-open">{selected.openTo}</p>
                  <div className="landing-scene-project">
                    <h3>{selected.project.title}</h3>
                    <p>{selected.project.summary}</p>
                    <p>
                      <span>Role </span>
                      {selected.project.role}
                    </p>
                    <p className="landing-scene-stack">{selected.project.stack}</p>
                  </div>
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="landing-scene-profile-skel" aria-hidden>
                <span />
                <span />
                <span />
              </div>
            )}
          </aside>
        </div>
        {!reduceMotion && complete ? (
          <button type="button" className="landing-scene-replay" onClick={replay} aria-label="Replay">
            <RotateCcw size={16} strokeWidth={1.5} aria-hidden />
          </button>
        ) : null}
      </div>
    </section>
  );
}
