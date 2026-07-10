// Shared reaction icons — single source so the feed, post page, and landing
// stay consistent. Soft, fully-rounded strokes; the fillable ones go solid when
// `on` (active). SameHere is a two-people glyph ("this is me too").
const s = { fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, viewBox: "0 0 24 24" };
const cls = "h-5 w-5";
const fillIf = (on?: boolean) => (on ? "currentColor" : "none");

export const IconSame = ({ on, className = cls }: { on?: boolean; className?: string }) => (
  <svg className={className} {...s} fill={fillIf(on)}>
    <circle cx="9" cy="8" r="3.6" />
    <path d="M2.5 20v-1a6.5 6.5 0 0 1 13 0v1Z" />
    <circle cx="17" cy="8.5" r="2.8" />
    <path d="M16 13.4A5.5 5.5 0 0 1 21.5 19v1" />
  </svg>
);

export const IconComment = () => (
  <svg className={cls} {...s}>
    <path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2Z" />
  </svg>
);

export const IconRepost = () => (
  <svg className={cls} {...s}>
    <path d="M17 2l4 4-4 4" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <path d="M7 22l-4-4 4-4" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
);

export const IconBookmark = ({ on }: { on?: boolean }) => (
  <svg className={cls} {...s} fill={fillIf(on)}>
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z" />
  </svg>
);

/** Pro member badge — blue bolt beside display name */
export const IconBolt = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M13 2 4.5 13.5H11l-1 8.5L19.5 10H13V2Z" />
  </svg>
);

/** Founder badge — first 100 signed-up users */
export const IconCrown = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M3 8l4.5 3.2L12 5l4.5 6.2L21 8l-1.6 10.4a1 1 0 0 1-1 .6H5.6a1 1 0 0 1-1-.6L3 8Z" />
  </svg>
);

/** Leaderboard nav — trophy (distinct from IconCrown = Founder badge). */
export const IconTrophy = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
  </svg>
);

/**
 * Social Butterfly badge — 100 confirmed referrals.
 * (Distinct from IconCrown = Founder and IconBolt = Pro.)
 *
 * Three-quarter view, caught mid-lift: the only badge in the row that moves.
 *
 * The wings separate by TONE, not by negative space. A hairline gap that reads
 * correctly at 64px is sub-pixel at `h-4 w-4` (16px) — it closes, and the mark
 * collapses into a blob. So the far forewing and hindwing sit behind at 45%
 * fill-opacity. That composites against whatever is behind it, so the icon still
 * inherits `currentColor` and needs no second colour token in either theme.
 *
 * ponytail: opacity, not a second fill. Don't "simplify" it back to one alpha.
 */
export const IconButterfly = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    {/* far forewing — set back */}
    <path fillOpacity="0.45" d="M11 3.4C9 4.6 7.8 7 8.2 9.4c.4 2.3 2.1 3.8 4 4.1-.5-2.1-.5-5 .1-7.3.3-1.2-.3-2.3-1.3-2.8Z" />
    {/* hindwing — set back */}
    <path fillOpacity="0.45" d="M13.5 14.6c-1.6-.8-4.5-1.2-6.5-.3-2.4 1-2.7 3.7-.5 4.6 2.3 1 5.3-.7 6.9-3 .2-.5.2-.9.1-1.3Z" />
    {/* near forewing — solid, sits in front */}
    <path d="M14.6 2.6c2.6.6 4.8 3.4 5 6.8.2 3-1.2 5-3 5.9-1.4-1.1-3-3.3-3.6-5.7-.5-2.2.2-5.2 1.6-7Z" />
    {/* abdomen, thorax, antenna */}
    <path d="M17 16.2c-1 1.2-3 2.8-5 3.8-1.4.7-2.6 1-3 .7-.1-.5 1-1.3 2.4-2.1 2-1.2 4-2.2 5-3Z" />
    <circle cx="17.4" cy="15.2" r="1.15" />
    <path d="M18 14.4c1-1.2 2-2 2.7-2.3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" fill="none" />
    <circle cx="21" cy="11.9" r="0.75" />
  </svg>
);

/** Verified Student badge — confirmed .edu affiliation (signup or /settings). */
export const IconGraduationCap = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M12 3 1 8l11 5 9-4.09V17h2V8Z" />
    <path d="M5 10.18V15c0 1.66 3.13 3 7 3s7-1.34 7-3v-4.82l-7 3.18Z" />
  </svg>
);

// Retained: still referenced by the landing profile demo (owned by the landing worktree).
export const IconFlag = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M6 2a1 1 0 0 1 1 1v18a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1Z" />
    <path d="M7 3.5h10.3a1 1 0 0 1 .8 1.6L15.4 9l2.7 3.9a1 1 0 0 1-.8 1.6H7Z" />
  </svg>
);

export const IconSearch = () => (
  <svg className={cls} {...s}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export const IconCompose = () => (
  <svg className={cls} {...s}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

export const IconMail = () => (
  <svg className={cls} {...s}>
    <path d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />
    <path d="m22 8-10 6L2 8" />
  </svg>
);

export const IconBell = () => (
  <svg className={cls} {...s}>
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

export const IconSend = () => (
  <svg className="h-4 w-4" {...s}>
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </svg>
);

/** Mention notification badge — @-sign. */
export const IconAt = ({ className = "h-2.5 w-2.5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="4" />
    <path d="M16 12v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-4.2 7.6" />
  </svg>
);

export const IconChevronLeft = () => (
  <svg className="h-4 w-4" {...s}>
    <path d="m15 6-6 6 6 6" />
  </svg>
);

/** Community nav — group of people (clubs + threads). */
// Community: a group of three people (a front figure flanked by two behind).
// Same figure language as IconSame (the SameHere reaction) but THREE, so it
// reads as a group/community and stays distinct from the two-person reaction.
export const IconCommunity = ({ className = cls }: { className?: string }) => (
  <svg className={className} {...s}>
    <circle cx="12" cy="9" r="3.1" />
    <path d="M6.2 19.5v-.6a5.8 5.8 0 0 1 11.6 0v.6" />
    <circle cx="5" cy="8.6" r="2.3" />
    <path d="M1.6 17.8a4.2 4.2 0 0 1 3.3-3" />
    <circle cx="19" cy="8.6" r="2.3" />
    <path d="M22.4 17.8a4.2 4.2 0 0 0-3.3-3" />
  </svg>
);

/** Pinned item marker. */
export const IconPin = ({ className = cls }: { className?: string }) => (
  <svg className={className} {...s}>
    <path d="M12 21s7-6.5 7-11a7 7 0 1 0-14 0c0 4.5 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.3" />
  </svg>
);

/**
 * Verified club badge — check-badge glyph. Stroke-only (no fill+cutout) so it
 * doesn't assume a background color to contrast against.
 */
export const IconVerified = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M8 3h8l5 5v8l-5 5H8l-5-5V8Z" />
    <path d="M8.5 12.3l2.3 2.3 4.5-5" />
  </svg>
);

/** Channel name marker — hash prefix (club channel names). */
export const IconHash = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M9 4 7 20M17 4l-2 16M4 9h16M3 15h16" />
  </svg>
);

/** Generic add action — e.g. create channel. */
export const IconPlus = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

/** Generic delete action — e.g. delete channel. */
export const IconTrash = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M4 7h16" />
    <path d="M10 11v6M14 11v6" />
    <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
    <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
  </svg>
);
