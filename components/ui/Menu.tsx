"use client";

import { useEffect, useRef, useState } from "react";

// Minimal dropdown: trigger + popover panel. Closes on outside-click, Esc, or
// clicking an item inside the panel. No dependency — useRef + a document
// mousedown listener. Generic enough for the post ⋯ menu and the navbar avatar menu.
// ponytail: hand-rolled dropdown, no menu lib
export default function Menu({
  trigger,
  children,
  align = "end",
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="grid h-7 w-7 place-items-center rounded-full text-[var(--ink-muted)] transition hover:bg-[var(--surface)] hover:text-[var(--ink)]"
      >
        {trigger}
      </button>
      {open && (
        // Closing on click here covers every item (link, button, form submit)
        // without each one needing its own onClick-then-close wiring.
        <div
          role="menu"
          onClick={() => setOpen(false)}
          className={`absolute top-full z-50 mt-1 min-w-[9rem] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg ${
            align === "end" ? "right-0" : "left-0"
          }`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
