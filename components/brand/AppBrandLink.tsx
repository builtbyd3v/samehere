"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import LandingNavBrand from "@/components/landing/LandingNavBrand";

const SESSION_KEY = "samehere-brand-animated";

/**
 * Persistent product wordmark → mark animation (same as landing).
 * Plays once per browser session, then settles on the mark so navigations
 * don't re-run the contract every time.
 */
export default function AppBrandLink({
  href = "/",
  className = "",
  onClick,
}: {
  href?: string;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  const [settled, setSettled] = useState<boolean | null>(null);

  useEffect(() => {
    let already = false;
    try {
      already = sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      already = false;
    }
    setSettled(already);
  }, []);

  useEffect(() => {
    if (settled !== false) return;
    const t = window.setTimeout(() => {
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* ignore */
      }
      setSettled(true);
    }, 1550);
    return () => window.clearTimeout(t);
  }, [settled]);

  // Hold layout space until we know whether to animate (avoids mark→wordmark flash).
  if (settled === null) {
    return (
      <Link
        href={href}
        className={`landing-brand-link landing-nav-brand-link landing-nav-brand-link--pending ${className}`}
        aria-label="samehere home"
        onClick={onClick}
      >
        <LandingNavBrand />
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={`landing-brand-link landing-nav-brand-link ${
        settled ? "landing-nav-brand-link--settled" : ""
      } ${className}`}
      aria-label="samehere home"
      onClick={onClick}
    >
      <LandingNavBrand />
    </Link>
  );
}
