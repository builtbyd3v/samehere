"use client";

import { cloneElement, createContext, useContext, useEffect, useRef, useState } from "react";

const MenuCloseContext = createContext<(() => void) | null>(null);

export function useMenuClose() {
  return useContext(MenuCloseContext);
}

// Mirrors --duration-menu (see app/globals.css); kept as a JS constant since
// the unmount delay below can't read a CSS custom property.
const EXIT_MS = 120;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Minimal dropdown: trigger + popover panel. Closes on outside-click, Esc, or
// when a child calls useMenuClose() (e.g. after opening a modal). Panel stays
// mounted for EXIT_MS after close so it can transition out instead of vanishing.
export default function Menu({
  trigger,
  children,
  align = "end",
  variant = "default",
  placement = "bottom",
  open: openProp,
  onOpenChange,
  customTrigger = false,
  fullWidth = false,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "end";
  variant?: "default" | "avatar";
  /** Anchor side the panel opens toward. "top" = grows upward from a bottom-anchored trigger. */
  placement?: "bottom" | "top";
  /** Controlled open state — lets a caller intercept trigger clicks (e.g. repost: no-menu path when there's nothing to quote). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** When true, `trigger` is already a full interactive element that manages its own onClick + `open`/`onOpenChange`; Menu only clones in aria attributes instead of wrapping its own <button>. */
  customTrigger?: boolean;
  /** Stretch the wrapper (and panel) to the trigger's full width — for select-style dropdowns in grid/flex cells. */
  fullWidth?: boolean;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- coordinates mount/exit-animation timing with the setTimeout below; moving this to render-time would shift when the exit class commits relative to the timer.
      setMounted(true);
      setClosing(false);
      return;
    }
    if (!mounted) return;
    setClosing(true);
    const t = setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, prefersReducedMotion() ? 0 : EXIT_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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

  const originClass =
    placement === "top"
      ? align === "end"
        ? "bottom-full mb-1 origin-bottom-right"
        : "bottom-full mb-1 origin-bottom-left"
      : align === "end"
        ? "top-full mt-1 origin-top-right"
        : "top-full mt-1 origin-top-left";

  return (
    <MenuCloseContext.Provider value={close}>
      <div ref={ref} className={fullWidth ? "relative block w-full" : "relative inline-block"}>
        {customTrigger
          ? cloneElement(trigger as React.ReactElement<{ "aria-haspopup"?: string; "aria-expanded"?: boolean }>, {
              "aria-haspopup": "menu",
              "aria-expanded": open,
            })
          : (
            <button
              type="button"
              onClick={() => setOpen(!open)}
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
          )}
        {mounted && (
          <div
            role="menu"
            className={`absolute z-50 min-w-[9rem] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg ${fullWidth ? "w-full" : ""} ${originClass} ${
              align === "end" ? "right-0" : "left-0"
            } ${closing ? "menu-exit" : "animate-[menu-pop_120ms_var(--ease-out)] motion-reduce:animate-none"}`}
          >
            {children}
          </div>
        )}
      </div>
    </MenuCloseContext.Provider>
  );
}
