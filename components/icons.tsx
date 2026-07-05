// Shared reaction icons — single source so the feed, post page, and landing
// stay consistent. Soft, fully-rounded strokes; the fillable ones go solid when
// `on` (active). SameHere is a two-people glyph ("this is me too").
const s = { fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, viewBox: "0 0 24 24" };
const cls = "h-5 w-5";
const fillIf = (on?: boolean) => (on ? "currentColor" : "none");

export const IconHeart = ({ on }: { on?: boolean }) => (
  <svg className={cls} {...s} fill={fillIf(on)}>
    <path d="M19 14c1.49-1.46 3-3.2 3-5.5A4.5 4.5 0 0 0 12 5.5 4.5 4.5 0 0 0 2 8.5c0 2.3 1.5 4.04 3 5.5l7 7Z" />
  </svg>
);

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

/** Campus Founder badge — 100 referred signups at one school. Distinct from IconCrown (global Founder). */
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

export const IconChevronLeft = () => (
  <svg className="h-4 w-4" {...s}>
    <path d="m15 6-6 6 6 6" />
  </svg>
);
