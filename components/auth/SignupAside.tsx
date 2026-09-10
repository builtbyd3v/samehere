import { Check } from "lucide-react";
import { IconCrown } from "@/components/icons";

// Founder-spots pill — stays directly under the headline on every breakpoint.
export function SignupFounderPill({ spotsLeft }: { spotsLeft?: number }) {
  if (spotsLeft == null || spotsLeft <= 0) return null;
  return (
    <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-1.5 text-sm">
      <IconCrown className="h-4 w-4 text-[var(--founder)]" />
      <span>
        <span className="font-semibold text-[var(--founder)]">{spotsLeft}</span>
        <span className="text-[var(--ink-muted)]"> of 100 founding spots left</span>
      </span>
    </p>
  );
}

function CheckMark() {
  return <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--blue)]" size={16} strokeWidth={1.75} aria-hidden />;
}

const POINTS = [
  "Sign up with .edu and you're a verified student",
  "Free forever: post, follow, and discover",
  "Any email works. Verify with .edu anytime in settings",
] as const;

// Reassurance bullets — left column on desktop, below the form on mobile.
export default function SignupReassurance() {
  return (
    <ul className="space-y-3 text-sm leading-relaxed text-[var(--ink-muted)]">
      {POINTS.map((p) => (
        <li key={p} className="flex items-start gap-2.5">
          <CheckMark />
          <span>{p}</span>
        </li>
      ))}
    </ul>
  );
}
