"use client";

import Link from "next/link";
import { useState, type MouseEventHandler } from "react";
import { resolveBrandMode } from "@/lib/brand/mode";
import { usePrefersReducedMotion } from "@/lib/landing/usePrefersReducedMotion";
import SameHereBrand from "./SameHereBrand";

export default function AppBrand({
  href,
  onClick,
  className,
}: {
  href: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  className?: string;
}) {
  const reduceMotion = usePrefersReducedMotion();
  const [played, setPlayed] = useState(false);

  return (
    <Link
      href={href}
      aria-label="samehere home"
      className={["brand-link", className].filter(Boolean).join(" ")}
      onClick={onClick}
      onAnimationEnd={(event) => {
        if (
          event.animationName.includes("samehere-brand-mark-in") ||
          event.animationName.includes("landing-brand-link-contract")
        ) {
          setPlayed(true);
        }
      }}
    >
      <SameHereBrand mode={resolveBrandMode({ played, reduceMotion })} />
    </Link>
  );
}
