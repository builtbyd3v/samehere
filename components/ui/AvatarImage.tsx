"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { isAnimatedAvatarUrl } from "@/lib/avatar";

// 1x1 transparent GIF — keeps layout while the animated src is unloaded.
const PLACEHOLDER =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

function subscribeTabVisible(cb: () => void) {
  document.addEventListener("visibilitychange", cb);
  return () => document.removeEventListener("visibilitychange", cb);
}

function getTabVisible() {
  return !document.hidden;
}

/**
 * Avatar image that pauses animated GIF/WebP when the tab is hidden or the
 * element leaves the viewport. Static JPG/PNG render as a plain img (no observers).
 * Pausing works by swapping src to a 1x1 placeholder — browsers only decode
 * animation while the real URL is loaded.
 */
export default function AvatarImage({
  src,
  alt = "",
  className,
}: {
  src: string;
  alt?: string;
  className?: string;
}) {
  const animated = isAnimatedAvatarUrl(src);

  if (!animated) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={className} />;
  }

  return <AnimatedAvatarImage src={src} alt={alt} className={className} />;
}

function AnimatedAvatarImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const ref = useRef<HTMLImageElement>(null);
  const tabVisible = useSyncExternalStore(subscribeTabVisible, getTabVisible, () => true);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "80px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const shouldPlay = tabVisible && inView;

  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={ref} src={shouldPlay ? src : PLACEHOLDER} alt={alt} className={className} />;
}
