"use client";

import { useTheme, type Theme } from "@/components/providers/ThemeProvider";

const OPTIONS: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();

  if (compact) {
    const cycle = () => {
      const order: Theme[] = ["light", "dark", "system"];
      setTheme(order[(order.indexOf(theme) + 1) % order.length]);
    };
    return (
      <button
        type="button"
        onClick={cycle}
        className="rounded-md px-2 py-1 text-xs text-[var(--ink-muted)] transition hover:bg-[var(--featured-surface)] hover:text-[var(--ink)]"
        title={`Theme: ${theme}`}
        aria-label={`Theme: ${theme}. Click to change.`}
      >
        {theme === "dark" ? "Dark" : theme === "light" ? "Light" : "Auto"}
      </button>
    );
  }

  return (
    <div className="inline-flex gap-0.5 rounded-full border border-[var(--border)] p-0.5" role="group" aria-label="Theme">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => setTheme(o.value)}
          aria-pressed={theme === o.value}
          className={`rounded-full px-2.5 py-1 text-xs transition ${
            theme === o.value
              ? "bg-[var(--featured-surface)] font-medium text-[var(--ink)]"
              : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
