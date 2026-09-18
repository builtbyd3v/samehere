// Shared reaction icons — single source so the feed, post page, and landing
// stay consistent. Lucide for general actions; SameHere stays the two-people glyph.
import {
  Bell,
  Bookmark,
  ChevronLeft,
  Mail,
  MessageCircle,
  Pencil,
  Repeat2,
  Search,
  Send,
} from "lucide-react";

const s = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, viewBox: "0 0 24 24" };
const cls = "h-5 w-5";
const fillIf = (on?: boolean) => (on ? "currentColor" : "none");
const lucide = { size: 20, strokeWidth: 1.5, "aria-hidden": true } as const;

export const IconSame = ({ on, className = cls }: { on?: boolean; className?: string }) => (
  <svg className={className} {...s} fill={fillIf(on)}>
    <circle cx="9" cy="8" r="3.6" />
    <path d="M2.5 20v-1a6.5 6.5 0 0 1 13 0v1Z" />
    <circle cx="17" cy="8.5" r="2.8" />
    <path d="M16 13.4A5.5 5.5 0 0 1 21.5 19v1" />
  </svg>
);

export const IconComment = () => <MessageCircle className={cls} {...lucide} />;

export const IconRepost = () => <Repeat2 className={cls} {...lucide} />;

export const IconBookmark = ({ on }: { on?: boolean }) => (
  <Bookmark className={cls} {...lucide} fill={fillIf(on)} />
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

export const IconSearch = () => <Search className={cls} {...lucide} />;

export const IconCompose = () => <Pencil className={cls} {...lucide} />;

export const IconMail = () => <Mail className={cls} {...lucide} />;

export const IconBell = () => <Bell className={cls} {...lucide} />;

export const IconSend = () => <Send className="h-4 w-4" size={16} strokeWidth={1.5} aria-hidden />;

/** Mention notification badge — @-sign. */
export const IconAt = ({ className = "h-2.5 w-2.5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="4" />
    <path d="M16 12v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-4.2 7.6" />
  </svg>
);

export const IconChevronLeft = () => (
  <ChevronLeft className="h-4 w-4" size={16} strokeWidth={1.5} aria-hidden />
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

