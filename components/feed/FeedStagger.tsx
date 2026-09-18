"use client";

import { Children, useState, type CSSProperties, type ReactNode } from "react";
import { usePrefersReducedMotion } from "@/lib/landing/usePrefersReducedMotion";

let firstFeedPaint = true;

export default function FeedStagger({ children }: { children: ReactNode }) {
  const reduceMotion = usePrefersReducedMotion();
  const [stagger] = useState(() => {
    const next = firstFeedPaint;
    firstFeedPaint = false;
    return next;
  });

  return (
    <>
      {Children.map(children, (child, index) => (
        <div
          className={stagger && !reduceMotion && index < 6 ? "feed-enter" : undefined}
          style={{ "--stagger-i": index } as CSSProperties}
        >
          {child}
        </div>
      ))}
    </>
  );
}
