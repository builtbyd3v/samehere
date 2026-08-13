"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LazyMotion, domMax, m, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import AppBrandLink from "@/components/brand/AppBrandLink";
import BrandChrome from "@/components/brand/BrandChrome";
import NavMenu from "@/components/layout/NavMenu";
import { IconBolt } from "@/components/icons";

export type PathNavId = "home" | "opportunities" | "applications" | "messages" | "prep";

const DEFAULT_LINKS: { id: PathNavId; href: string; label: string }[] = [
  { id: "home", href: "/home", label: "Path" },
  { id: "opportunities", href: "/jobs", label: "Opportunities" },
  { id: "applications", href: "/applications", label: "Applications" },
  { id: "prep", href: "/prep", label: "Prep" },
  { id: "messages", href: "/messages", label: "Messages" },
];

function activeId(pathname: string): PathNavId | null {
  if (pathname === "/home" || pathname.startsWith("/home/") || pathname.startsWith("/projects/")) {
    return "home";
  }
  if (pathname.startsWith("/jobs")) return "opportunities";
  if (pathname.startsWith("/applications")) return "applications";
  if (pathname.startsWith("/prep")) return "prep";
  if (pathname.startsWith("/messages")) return "messages";
  return null;
}

function orderLinks(emphasis: string[] | undefined) {
  if (!emphasis?.length) return DEFAULT_LINKS;
  const byId = new Map(DEFAULT_LINKS.map((l) => [l.id, l]));
  const ordered: typeof DEFAULT_LINKS = [];
  for (const raw of emphasis) {
    const id = raw as PathNavId;
    const link = byId.get(id);
    if (link && !ordered.includes(link)) ordered.push(link);
  }
  for (const link of DEFAULT_LINKS) {
    if (!ordered.includes(link)) ordered.push(link);
  }
  return ordered;
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

export default function PathAppNav({
  username,
  avatarUrl,
  isPro,
  isAdmin,
  dmUnread = 0,
  navEmphasis,
}: {
  username: string | null;
  avatarUrl: string | null;
  isPro: boolean;
  isAdmin: boolean;
  dmUnread?: number;
  navEmphasis?: string[];
}) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  // Open when menuPath matches the current route; a route change clears the match
  // without a pathname effect that would set state synchronously.
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const menuOpen = menuPath === pathname;
  const closeMenu = () => setMenuPath(null);
  const current = activeId(pathname);
  const links = orderLinks(navEmphasis);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <LazyMotion features={domMax} strict>
      {menuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          aria-label="Close menu"
          onClick={closeMenu}
        />
      )}

      <header className="landing-nav path-app-nav sticky top-0 z-50">
        <BrandChrome
          center={
            <nav
              className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex"
              aria-label="Path"
            >
              {links.map((link) => {
                const active = current === link.id;
                const emphasized = navEmphasis?.[0] === link.id;
                return (
                  <Link
                    key={link.id}
                    href={link.href}
                    className={`relative px-3 py-1.5 text-sm transition-colors ${
                      active ? "landing-nav-active" : "landing-nav-link"
                    } ${emphasized && !active ? "path-nav-emphasized" : ""}`}
                  >
                    {link.label}
                    {link.id === "messages" && dmUnread > 0 ? (
                      <span className="ml-1.5 inline-grid h-4 min-w-4 place-items-center rounded-full bg-[var(--accent-blue)] px-1 text-[10px] font-semibold text-white tabular-nums">
                        {dmUnread > 99 ? "99+" : dmUnread}
                      </span>
                    ) : null}
                    {active && (
                      <m.span
                        layoutId="path-nav-underline"
                        transition={
                          reduceMotion ? { duration: 0 } : { duration: 0.2, ease: [0.16, 1, 0.3, 1] }
                        }
                        className="absolute inset-x-3 -bottom-0.5 h-[2px] rounded-full bg-[var(--accent-blue)]"
                        aria-hidden
                      />
                    )}
                  </Link>
                );
              })}
            </nav>
          }
          right={
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              {isPro ? (
                <Link
                  href="/pro"
                  title="Pro"
                  className="hidden h-8 w-8 place-items-center rounded-full text-[var(--accent-blue-strong)] transition hover:bg-[var(--featured-surface)] sm:grid"
                >
                  <IconBolt className="h-4 w-4" />
                </Link>
              ) : (
                <Link href="/pro" className="landing-nav-secondary hidden sm:inline-flex">
                  Upgrade
                </Link>
              )}
              {username ? (
                <NavMenu username={username} avatarUrl={avatarUrl} isAdmin={isAdmin} isPro={isPro} />
              ) : null}
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] text-[var(--ink)] transition hover:bg-[var(--featured-surface)] md:hidden"
                aria-expanded={menuOpen}
                aria-controls="path-mobile-menu"
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                onClick={() => setMenuPath(menuOpen ? null : pathname)}
              >
                <MenuIcon open={menuOpen} />
              </button>
            </div>
          }
          below={
            menuOpen ? (
              <nav
                id="path-mobile-menu"
                className="origin-top border-t border-[var(--border)] px-3 py-3 md:hidden animate-[menu-pop_150ms_var(--ease-out)] motion-reduce:animate-none"
                aria-label="Path"
              >
                <ul className="flex flex-col gap-0.5">
                  {links.map((link) => {
                    const active = current === link.id;
                    return (
                      <li key={link.id}>
                        <Link
                          href={link.href}
                          onClick={closeMenu}
                          className={`flex items-center rounded-lg px-3 py-2.5 text-[15px] transition ${
                            active
                              ? "bg-[var(--featured-surface)] font-medium text-[var(--accent-blue-strong)]"
                              : "text-[var(--ink-muted)] hover:bg-[var(--featured-surface)] hover:text-[var(--ink)]"
                          }`}
                        >
                          {link.label}
                          {link.id === "messages" && dmUnread > 0 ? (
                            <span className="ml-auto text-xs tabular-nums text-[var(--accent-blue-strong)]">
                              {dmUnread}
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                  <li className="mt-2 border-t border-[var(--border)] pt-2">
                    <Link
                      href="/pro"
                      onClick={closeMenu}
                      className="flex items-center rounded-lg px-3 py-2.5 text-[15px] text-[var(--ink-muted)] transition hover:bg-[var(--featured-surface)] hover:text-[var(--ink)]"
                    >
                      {isPro ? "Manage plan" : "Upgrade"}
                    </Link>
                  </li>
                </ul>
              </nav>
            ) : null
          }
        >
          <AppBrandLink href={username ? "/home" : "/"} />
        </BrandChrome>
      </header>
    </LazyMotion>
  );
}
