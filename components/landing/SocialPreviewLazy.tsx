"use client";

import dynamic from "next/dynamic";

// Below-fold motion demo — keep out of the landing first-load JS graph.
const SocialPreview = dynamic(() => import("./SocialPreview"), {
  ssr: false,
  loading: () => (
    <section
      id="community"
      className="landing-social reveal-view"
      style={{ minHeight: "28rem" }}
      aria-hidden
    />
  ),
});

export default function SocialPreviewLazy() {
  return <SocialPreview />;
}
