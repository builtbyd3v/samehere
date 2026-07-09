"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { isAnimatedAvatarUrl } from "@/lib/avatar";

// 1x1 transparent GIF — keeps layout while the animated src is unloaded.
const PLACEHOLDER =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

// Avatars are always square; callers control the rendered size via className
// (h-N w-N). This is only the intrinsic size next/image needs for its 1:1
// aspect ratio — it does not affect the on-screen size.
const SIZE = 40;

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
  style,
}: {
  src: string;
  alt?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const animated = isAnimatedAvatarUrl(src);

  if (!animated) {
    return <Image src={src} alt={alt} width={SIZE} height={SIZE} className={className} style={style} />;
  }

  return <AnimatedAvatarImage src={src} alt={alt} className={className} style={style} />;
}

function AnimatedAvatarImage({
  src,
  alt,
  className,
  style,
}: {
  src: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
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

  // unoptimized: this is an animated GIF/WebP — Next's optimizer would strip
  // the animation (and re-encode) otherwise.
  return (
    <Image
      ref={ref}
      src={shouldPlay ? src : PLACEHOLDER}
      alt={alt}
      width={SIZE}
      height={SIZE}
      unoptimized
      className={className}
      style={style}
    />
  );
}
