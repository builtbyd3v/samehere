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
  // Start visible immediately — no opacity-0 pending gate after hydration.
  const [settled, setSettled] = useState(brandAnimatedThisLoad);

  useEffect(() => {
    try {
      sessionStorage.removeItem("samehere-brand-animated");
    } catch {
      /* ignore */
    }

    if (brandAnimatedThisLoad) {
      setSettled(true);
      return;
    }

    const t = window.setTimeout(() => {
      brandAnimatedThisLoad = true;
      setSettled(true);
    }, 1550);
    return () => window.clearTimeout(t);
  }, []);

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
