"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

const MenuCloseContext = createContext<(() => void) | null>(null);

export function useMenuClose() {
  return useContext(MenuCloseContext);
}

// Minimal dropdown: trigger + popover panel. Closes on outside-click, Esc, or
// when a child calls useMenuClose() (e.g. after opening a modal).
export default function Menu({
  trigger,
  children,
  align = "end",
  variant = "default",
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "end";
  variant?: "default" | "avatar";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);

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
    <MenuCloseContext.Provider value={close}>
      <div ref={ref} className="relative inline-block">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
          className={
            variant === "avatar"
              ? "h-8 w-8 shrink-0 overflow-hidden rounded-full border border-[var(--border)] transition hover:opacity-90 hover:border-[var(--border-strong)]"
              : "grid h-7 w-7 place-items-center rounded-full text-[var(--ink-muted)] transition hover:bg-[var(--featured-surface)] hover:text-[var(--ink)]"
          }
        >
          {trigger}
        </button>
        {open && (
          <div
            role="menu"
            className={`absolute top-full z-50 mt-1 min-w-[9rem] origin-top overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg animate-[menu-pop_120ms_var(--ease-out)] motion-reduce:animate-none ${
              align === "end" ? "right-0 origin-top-right" : "left-0 origin-top-left"
            }`}
          >
            {children}
          </div>
        )}
      </div>
    </MenuCloseContext.Provider>
  );
}
