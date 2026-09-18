"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useState, type ReactNode } from "react";
import { usePrefersReducedMotion } from "@/lib/landing/usePrefersReducedMotion";

const LandingAtmosphere = dynamic(() => import("./LandingAtmosphere"), {
  ssr: false,
});

function canCreateWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

class AtmosphereBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

export default function LandingAtmosphereLazy() {
  const reduceMotion = usePrefersReducedMotion();
  const [load, setLoad] = useState(false);

  useEffect(() => {
    setLoad(!reduceMotion && canCreateWebGL());
  }, [reduceMotion]);

  if (!load) return null;
  return (
    <AtmosphereBoundary>
      <LandingAtmosphere />
    </AtmosphereBoundary>
  );
}
