"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/landing/usePrefersReducedMotion";

const LandingAtmosphere = dynamic(() => import("./LandingAtmosphere"), {
  ssr: false,
});

export default function LandingAtmosphereLazy() {
  const reduceMotion = usePrefersReducedMotion();
  const [load, setLoad] = useState(false);

  useEffect(() => {
    setLoad(!reduceMotion);
  }, [reduceMotion]);

  if (!load) return null;
  return <LandingAtmosphere />;
}
