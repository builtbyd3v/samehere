"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import LandingNavBrand from "@/components/landing/LandingNavBrand";

/**
 * Wordmark → mark plays on each full page load / refresh.
 * In-app client navigations reuse this module flag so the morph doesn't
 * restart on every route change.
 */
let brandAnimatedThisLoad = false;

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
    // Drop the old sessionStorage latch if present (it skipped the morph on refresh).
    try {
      sessionStorage.removeItem("samehere-brand-animated");
    } catch {
      /* ignore */
    }
    setSettled(brandAnimatedThisLoad);
  }, []);

  useEffect(() => {
    if (settled !== false) return;
    const t = window.setTimeout(() => {
      brandAnimatedThisLoad = true;
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
