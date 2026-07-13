// Shared "AI did this" motif — a small blue pill used wherever the AI layer
// surfaces (hero match reason, feed icebreaker, job fit reason). Ties pillar 4
// (AI-native) through the other scenes instead of giving it its own section.
export default function AiTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--blue-glow)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--blue)]">
      <svg aria-hidden viewBox="0 0 24 24" width="10" height="10" fill="currentColor">
        <path d="M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2Z" />
      </svg>
      {children}
    </span>
  );
}
