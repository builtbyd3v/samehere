"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { BufferAttribute, BufferGeometry, Color, Points, type PointsMaterial } from "three";

const CORE = new Color("#0075de");
const WASH = new Color("#4f9fe8");
const COUNT = 160;

/** Deterministic 0..1 — lint forbids Math.random during render. */
function unit(i: number, salt: number): number {
  const x = Math.imul(i + 1, 0x9e3779b9 ^ salt);
  return ((x >>> 0) % 10000) / 10000;
}

function DriftField() {
  const points = useRef<Points>(null);
  const material = useRef<PointsMaterial>(null);
  const geometry = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (unit(i, 1) - 0.5) * 16;
      positions[i * 3 + 1] = (unit(i, 2) - 0.5) * 7;
      positions[i * 3 + 2] = (unit(i, 3) - 0.5) * 4;
      const color = i % 2 === 0 ? CORE : WASH;
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    const next = new BufferGeometry();
    next.setAttribute("position", new BufferAttribute(positions, 3));
    next.setAttribute("color", new BufferAttribute(colors, 3));
    return next;
  }, []);

  useFrame((state) => {
    if (!points.current) return;
    const t = state.clock.elapsedTime;
    points.current.rotation.y = t * 0.01;
    points.current.rotation.x = Math.sin(t * 0.07) * 0.03;
    if (material.current) material.current.opacity = 0.28 + Math.sin(t * 0.35) * 0.04;
  });

  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial
        ref={material}
        size={0.045}
        vertexColors
        transparent
        opacity={0.3}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

/** Landing-only WebGL wash. Never import from feed, auth, or app chrome. */
export default function LandingAtmosphere() {
  return (
    <div className="landing-atmosphere" aria-hidden>
      <Canvas
        dpr={[1, 1.25]}
        camera={{ position: [0, 0, 8], fov: 48 }}
        gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
        style={{ pointerEvents: "none", width: "100%", height: "100%" }}
      >
        <DriftField />
      </Canvas>
    </div>
  );
}
