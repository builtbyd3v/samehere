"use client";

import dynamic from "next/dynamic";

// Hero stage is reserved by .landing-hero-stage CSS — empty fallback keeps CLS at 0
// while motion/SocialScene JS loads off the critical path.
const SocialScene = dynamic(() => import("./SocialScene"), {
  ssr: false,
  loading: () => <div className="landing-scene" aria-hidden />,
});

export default function SocialSceneLazy() {
  return <SocialScene />;
}
