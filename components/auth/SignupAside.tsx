import { IconCrown } from "@/components/icons";

function Check() {
  return (
    <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--blue)]" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

const POINTS = [
  "Verified students only, .edu required",
  "Free forever: post, follow, and discover",
  "We only use your email to verify you're a student",
] as const;

export default function SignupAside({ spotsLeft }: { spotsLeft?: number }) {
  return (
    <div className="mt-8">
      {spotsLeft != null && spotsLeft > 0 && (
        <p className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-3.5 py-1.5 text-sm shadow-paper">
          <IconCrown className="h-4 w-4 text-[var(--founder)]" />
          <span>
            <span className="font-semibold text-[var(--founder)]">{spotsLeft}</span>
            <span className="text-[var(--ink-muted)]"> of 100 founding spots left</span>
          </span>
        </p>
      )}
      <ul className="mt-6 space-y-3 text-sm leading-relaxed text-[var(--ink-muted)]">
        {POINTS.map((p) => (
          <li key={p} className="flex items-start gap-2.5">
            <Check />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
