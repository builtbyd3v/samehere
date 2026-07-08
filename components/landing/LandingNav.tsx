"use client";

import Link from "next/link";
import { useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { signupCtaSm } from "./cta";

const LINKS = [
  { href: "#features", id: "features", label: "Profiles" },
  { href: "#ai", id: "ai", label: "AI" },
  { href: "#pricing", id: "pricing", label: "Pricing" },
  { href: "#faq", id: "faq", label: "FAQ" },
] as const;

const HERO_CLEARANCE = 80;
const SPY_LEAD = 16;

function sectionTop(el: HTMLElement) {
  return el.getBoundingClientRect().top + window.scrollY;
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden className="text-[var(--ink)]">
      {open ? (
        <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      ) : (
        <>
          <path d="M3 6h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M3 10h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M3 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

export default function LandingNav() {
  const reduceMotion = useReducedMotion();
  const headerRef = useRef<HTMLElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const scrollBehavior = reduceMotion ? "auto" : "smooth";

  const navBottom = useCallback(() => {
    const rect = headerRef.current?.getBoundingClientRect();
    return rect ? rect.bottom + SPY_LEAD : 96;
  }, []);

  const updateActive = useCallback(() => {
    if (window.scrollY < HERO_CLEARANCE) {
      setActiveId(null);
      return;
    }

    const spyLine = navBottom();
    let current: string | null = null;

    for (let i = LINKS.length - 1; i >= 0; i--) {
      const el = document.getElementById(LINKS[i].id);
      if (!el) continue;
      if (el.getBoundingClientRect().top <= spyLine) {
        current = LINKS[i].id;
        break;
      }
    }

    setActiveId(current);
  }, [navBottom]);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    let ticking = false;
    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          updateActive();
          ticking = false;
        });
      }
    }

    const ro = new ResizeObserver(onScroll);
    ro.observe(el);

    updateActive();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [updateActive, menuOpen]);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash || !LINKS.some((l) => l.id === hash)) return;

    requestAnimationFrame(() => {
      const el = document.getElementById(hash);
      if (!el) return;
      const bottom = headerRef.current?.getBoundingClientRect().bottom ?? 76;
      const top = sectionTop(el) - bottom - 8;
      window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
      setActiveId(hash);
    });
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  function scrollToTop(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    closeMenu();
    setActiveId(null);
    window.scrollTo({ top: 0, behavior: scrollBehavior });
    window.history.replaceState(null, "", "/");
  }

  function scrollToSection(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;

    closeMenu();
    setActiveId(id);
    const bottom = headerRef.current?.getBoundingClientRect().bottom ?? 76;
    const top = sectionTop(el) - bottom - 8;
    window.scrollTo({ top: Math.max(0, top), behavior: scrollBehavior });
    window.history.replaceState(null, "", `#${id}`);
  }

  const linkText = (id: string) =>
    activeId === id ? "font-medium text-[var(--ink)]" : "text-[var(--ink-muted)] hover:text-[var(--ink)]";

  return (
    <>
      {menuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-[var(--ink)]/10 md:hidden"
          aria-label="Close menu"
          onClick={closeMenu}
        />
      )}

      {/* top-3 = floating inset when pinned; scrolls with page until it reaches that offset */}
      <header ref={headerRef} className="sticky top-3 z-50 px-4 pb-2">
        <div className="relative mx-auto max-w-[1200px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--canvas)]/90 backdrop-blur-md">
          <div className="relative flex h-14 items-center justify-between gap-3 px-4 sm:px-5">
            <Link
              href="/"
              className="shrink-0 text-lg font-semibold tracking-[-0.02em] text-[var(--ink)] transition hover:opacity-80"
              onClick={scrollToTop}
            >
              samehere
            </Link>

            <nav className="absolute left-1/2 hidden -translate-x-1/2 md:flex" aria-label="Page sections">
              <div className="flex items-center gap-0.5 rounded-full border border-[var(--border)] p-1">
                {LINKS.map((link) => (
                  <a
                    key={link.id}
                    href={link.href}
                    onClick={(e) => scrollToSection(e, link.id)}
                    className={`relative rounded-full px-3.5 py-1.5 text-sm transition-colors ${linkText(link.id)}`}
                  >
                    {activeId === link.id && (
                      <span className="absolute inset-0 rounded-full bg-[var(--featured-surface)]" aria-hidden />
                    )}
                    <span className="relative z-10">{link.label}</span>
                  </a>
                ))}
              </div>
            </nav>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <Link
                href="/login"
                className="hidden text-sm text-[var(--ink-muted)] transition hover:text-[var(--ink)] sm:inline-flex"
              >
                Log in
              </Link>
              <Link href="/signup" className={signupCtaSm}>
                <span className="hidden sm:inline">Join with .edu</span>
                <span className="sm:hidden">Join</span>
              </Link>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] text-[var(--ink)] transition hover:bg-[var(--featured-surface)] md:hidden"
                aria-expanded={menuOpen}
                aria-controls="landing-mobile-menu"
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                onClick={() => setMenuOpen((o) => !o)}
              >
                <MenuIcon open={menuOpen} />
              </button>
            </div>
          </div>

          {menuOpen && (
            <nav
              id="landing-mobile-menu"
              className="border-t border-[var(--border)] px-3 py-3 md:hidden"
              aria-label="Page sections"
            >
              <ul className="flex flex-col gap-0.5">
                {LINKS.map((link) => (
                  <li key={link.id}>
                    <a
                      href={link.href}
                      onClick={(e) => scrollToSection(e, link.id)}
                      className={`flex items-center rounded-lg px-3 py-2.5 text-[15px] transition ${
                        activeId === link.id
                          ? "bg-[var(--featured-surface)] font-medium text-[var(--ink)]"
                          : "text-[var(--ink-muted)] hover:bg-[var(--featured-surface)] hover:text-[var(--ink)]"
                      }`}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
                <li className="mt-2 border-t border-[var(--border)] pt-2">
                  <Link
                    href="/login"
                    className="flex items-center rounded-lg px-3 py-2.5 text-[15px] text-[var(--ink-muted)] transition hover:bg-[var(--featured-surface)] hover:text-[var(--ink)]"
                    onClick={closeMenu}
                  >
                    Log in
                  </Link>
                </li>
              </ul>
            </nav>
          )}
        </div>
      </header>
    </>
  );
}
