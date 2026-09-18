import { PORTFOLIO_UNAVAILABLE } from "@/lib/portfolio/errors";

export default function UnavailableNotice({ message = PORTFOLIO_UNAVAILABLE }: { message?: string }) {
  return (
    <p role="status" className="card mt-3 px-4 py-3 text-sm text-[var(--ink-muted)]">
      {message}
    </p>
  );
}
