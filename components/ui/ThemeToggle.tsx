"use client";

import { useTheme, type Theme } from "@/components/providers/ThemeProvider";

const OPTIONS: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="inline-flex gap-0.5 rounded-full border border-[var(--border)] p-0.5" role="group" aria-label="Theme">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => setTheme(o.value)}
          aria-pressed={theme === o.value}
          className={`cursor-pointer rounded-full px-2.5 py-1 text-xs transition ${
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
