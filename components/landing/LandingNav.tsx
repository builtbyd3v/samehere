"use client";

import Link from "next/link";
import { LazyMotion, domMax, m } from "motion/react";
import { Menu, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/landing/usePrefersReducedMotion";
import AppBrand from "@/components/brand/AppBrand";
import { signupCtaSm } from "./cta";

const LINKS = [
  { href: "#product", id: "product", label: "Product" },
  { href: "#community", id: "community", label: "Community" },
  { href: "#pricing", id: "pricing", label: "Pricing" },
] as const;

const HERO_CLEARANCE = 80;
const SPY_LEAD = 16;

function sectionTop(el: HTMLElement) {
  return el.getBoundingClientRect().top + window.scrollY;
}

function MenuIcon({ open }: { open: boolean }) {
  const Icon = open ? X : Menu;
  return <Icon size={20} strokeWidth={1.5} aria-hidden className="text-[var(--ink)]" />;
}

export default function LandingNav() {
  const reduceMotion = usePrefersReducedMotion();
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const spyLocked = useRef(false);
  const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollBehavior = reduceMotion ? "auto" : "smooth";

  const navBottom = useCallback(() => {
    const rect = headerRef.current?.getBoundingClientRect();
    return rect ? rect.bottom + SPY_LEAD : 96;
  }, []);

  const updateActive = useCallback(() => {
    setScrolled(window.scrollY > 8);
    if (spyLocked.current) return;

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

    function releaseLock() {
      spyLocked.current = false;
    }

    const ro = new ResizeObserver(onScroll);
    ro.observe(el);

    updateActive();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    window.addEventListener("wheel", releaseLock, { passive: true });
    window.addEventListener("touchmove", releaseLock, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("wheel", releaseLock);
      window.removeEventListener("touchmove", releaseLock);
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

  const closeMenu = useCallback((restoreFocus = false) => {
    setMenuOpen(false);
    if (restoreFocus) menuButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeMenu(true);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeMenu, menuOpen]);

  function lockSpy() {
    spyLocked.current = true;
    if (lockTimer.current) clearTimeout(lockTimer.current);
    lockTimer.current = setTimeout(() => {
      spyLocked.current = false;
    }, 700);
  }

  function scrollToTop(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    closeMenu();
    setActiveId(null);
    lockSpy();
    window.scrollTo({ top: 0, behavior: scrollBehavior });
    window.history.replaceState(null, "", "/");
  }

  function scrollToSection(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;

    closeMenu();
    setActiveId(id);
    lockSpy();
    const bottom = headerRef.current?.getBoundingClientRect().bottom ?? 76;
    const top = sectionTop(el) - bottom - 8;
    window.scrollTo({ top: Math.max(0, top), behavior: scrollBehavior });
    window.history.replaceState(null, "", `#${id}`);
  }

  const linkText = (id: string) =>
    activeId === id ? "landing-nav-active" : "landing-nav-link";

  return (
    <LazyMotion features={domMax} strict>
      {menuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-[var(--ink)]/10 md:hidden"
          aria-label="Close menu"
          onClick={() => closeMenu(true)}
        />
      )}

      <header ref={headerRef} className="landing-nav fixed inset-x-0 top-0 z-50">
        <div
          className={`landing-nav-shell relative mx-auto max-w-[77rem] transition-[background-color,border-color] duration-200 ${
            scrolled ? "landing-nav-scrolled" : ""
          }`}
        >
          <div className="relative flex h-16 items-center justify-between gap-4 px-4">
            <AppBrand href="/" onClick={scrollToTop} className="landing-brand-link" />

            <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex" aria-label="Page sections">
              {LINKS.map((link) => (
                <a
                  key={link.id}
                  href={link.href}
                  aria-current={activeId === link.id ? "true" : undefined}
                  onClick={(e) => scrollToSection(e, link.id)}
                  className={`relative px-3 py-1.5 text-sm transition-colors ${linkText(link.id)}`}
                >
                  {link.label}
                  {activeId === link.id && (
                    <m.span
                      layoutId="nav-underline"
                      transition={reduceMotion ? { duration: 0 } : { duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute inset-x-3 -bottom-0.5 h-[2px] rounded-full bg-[var(--accent-blue)]"
                      aria-hidden
                    />
                  )}
                </a>
              ))}
            </nav>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <Link href="/login" className="landing-nav-secondary hidden md:inline-flex">
                Log in
              </Link>
              <Link href="/signup" className={`${signupCtaSm} landing-nav-mobile-primary md:hidden`}>
                Join
              </Link>
              <Link href="/signup" className="landing-nav-primary-single hidden md:inline-flex">
                Join free
              </Link>
              <button
                ref={menuButtonRef}
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
              className="origin-top border-t border-[var(--border)] px-3 py-3 md:hidden animate-[menu-pop_150ms_var(--ease-out)] motion-reduce:animate-none"
              aria-label="Page sections"
            >
              <ul className="flex flex-col gap-0.5">
                {LINKS.map((link) => (
                  <li key={link.id}>
                    <a
                      href={link.href}
                      aria-current={activeId === link.id ? "true" : undefined}
                      onClick={(e) => scrollToSection(e, link.id)}
                      className={`flex items-center rounded-lg px-3 py-2.5 text-[15px] transition ${
                        activeId === link.id
                          ? "bg-[var(--featured-surface)] font-medium text-[var(--accent-blue-strong)]"
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
                    onClick={() => closeMenu()}
                  >
                    Log in
                  </Link>
                </li>
              </ul>
            </nav>
          )}
        </div>
      </header>
    </LazyMotion>
  );
}
