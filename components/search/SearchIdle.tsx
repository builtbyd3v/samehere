import Link from "next/link";
import EmptyState from "@/components/ui/EmptyState";

const SUGGESTIONS = [
  { href: "/feed", label: "Browse Latest", hint: "Stuck, Learning, and Building posts" },
  { href: "/feed?tab=following", label: "Your Following feed", hint: "Shape it by following people" },
] as const;

export default function SearchIdle() {
  return (
    <div className="mt-6">
      <EmptyState
        title="Search people, projects, and posts"
        description="Try a name, username, school, or project. When the network is thin, Latest still surfaces people posting Stuck."
      >
        <ul className="mx-auto mt-5 max-w-sm space-y-2 text-left">
          {SUGGESTIONS.map((s) => (
            <li key={s.href}>
              <Link
                href={s.href}
                className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3.5 py-2.5 transition hover:border-[var(--border-strong)]"
              >
                <span className="text-sm font-medium text-[var(--ink)]">{s.label}</span>
                <span className="text-xs text-[var(--ink-muted)]">{s.hint}</span>
              </Link>
            </li>
          ))}
        </ul>
      </EmptyState>
    </div>
  );
}
