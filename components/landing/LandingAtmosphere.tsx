"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  Mesh,
  Points,
  type MeshStandardMaterial,
  type PointsMaterial,
} from "three";

const CORE = new Color("#0075de");
const WASH = new Color("#4f9fe8");
const PER_PLANE = 16;
const SETTLE_START_MS = 480;
const SETTLE_END_MS = 1400;
const BREATHE_S = 9;
const BASE_OPACITY = 0.28;
const BREATHE = 0.03;
const DISPERSE = 1.08;

const PLANES = [
  { z: -2.4, size: 0.05, salt: 11 },
  { z: -0.6, size: 0.08, salt: 17 },
  { z: 0.7, size: 0.11, salt: 23 },
  { z: 2.1, size: 0.16, salt: 41 },
] as const;

const RAD2DEG = 180 / Math.PI;

/** Shared pose for the WebGL camera and the DOM frame. */
function framePose(t: number, scrollY: number) {
  const swayX = Math.sin(t * 0.11) * 1.15;
  const swayY = Math.cos(t * 0.09) * 0.42;
  const camZ = 7.6 + Math.sin(t * 0.07) * 0.55;
  const scroll = scrollY * 0.00032;
  return {
    camX: swayX,
    camY: scroll + swayY,
    camZ,
    lookY: scroll,
    rx: Math.atan2(swayY, camZ) * RAD2DEG,
    ry: -Math.atan2(swayX, camZ) * RAD2DEG,
    tz: Math.sin(t * 0.08) * 22,
  };
}

/** Deterministic 0..1 — lint forbids Math.random during render. */
function unit(i: number, salt: number): number {
  const x = Math.imul(i + 1, 0x9e3779b9 ^ salt);
  return ((x >>> 0) % 10000) / 10000;
}

/** cubic-bezier(0.22, 1, 0.36, 1) — --ease-brand */
function easeBrand(t: number): number {
  const x1 = 0.22;
  const y1 = 1;
  const x2 = 0.36;
  const y2 = 1;
  let x = t;
  for (let i = 0; i < 8; i++) {
    const cx = 3 * x1;
    const bx = 3 * (x2 - x1) - cx;
    const ax = 1 - cx - bx;
    const current = ((ax * x + bx) * x + cx) * x - t;
    const derivative = (3 * ax * x + 2 * bx) * x + cx;
    if (Math.abs(derivative) < 1e-6) break;
    x -= current / derivative;
  }
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  return ((ay * x + by) * x + cy) * x;
}

function makeAlphaMap(): CanvasTexture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new CanvasTexture(canvas);
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.35, "rgba(255,255,255,0.55)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const tex = new CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function DepthPlane({
  z,
  size,
  salt,
  sprite,
}: {
  z: number;
  size: number;
  salt: number;
  sprite: CanvasTexture;
}) {
  const points = useRef<Points>(null);
  const material = useRef<PointsMaterial>(null);
  const startedAtRef = useRef(0);
  const settledRef = useRef(false);
  const field = useMemo(() => {
    const rest = new Float32Array(PER_PLANE * 3);
    const dispersed = new Float32Array(PER_PLANE * 3);
    const colors = new Float32Array(PER_PLANE * 3);
    for (let i = 0; i < PER_PLANE; i++) {
      const x = (unit(i, salt) - 0.5) * 14;
      const y = (unit(i, salt + 1) - 0.5) * 6.2;
      const zz = z + (unit(i, salt + 2) - 0.5) * 0.35;
      rest[i * 3] = x;
      rest[i * 3 + 1] = y;
      rest[i * 3 + 2] = zz;
      dispersed[i * 3] = x * DISPERSE;
      dispersed[i * 3 + 1] = y * DISPERSE;
      dispersed[i * 3 + 2] = zz * DISPERSE;
      const color = i % 2 === 0 ? CORE : WASH;
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(dispersed.slice(), 3));
    geometry.setAttribute("color", new BufferAttribute(colors, 3));
    return { rest, dispersed, geometry };
  }, [salt, z]);

  useEffect(() => () => field.geometry.dispose(), [field]);

  useFrame(() => {
    if (!points.current) return;
    if (startedAtRef.current === 0) startedAtRef.current = performance.now();
    const elapsed = performance.now() - startedAtRef.current;
    let u = 0;
    if (elapsed >= SETTLE_END_MS) u = 1;
    else if (elapsed > SETTLE_START_MS) {
      u = easeBrand((elapsed - SETTLE_START_MS) / (SETTLE_END_MS - SETTLE_START_MS));
    }

    if (!settledRef.current) {
      const pos = points.current.geometry.getAttribute("position");
      for (let i = 0; i < PER_PLANE; i++) {
        const i3 = i * 3;
        pos.setXYZ(
          i,
          field.dispersed[i3] + (field.rest[i3] - field.dispersed[i3]) * u,
          field.dispersed[i3 + 1] + (field.rest[i3 + 1] - field.dispersed[i3 + 1]) * u,
          field.dispersed[i3 + 2] + (field.rest[i3 + 2] - field.dispersed[i3 + 2]) * u,
        );
      }
      pos.needsUpdate = true;
      if (u === 1) settledRef.current = true;
    } else {
      const pos = points.current.geometry.getAttribute("position");
      const wave = elapsed / 1000;
      for (let i = 0; i < PER_PLANE; i++) {
        const i3 = i * 3;
        pos.setXYZ(
          i,
          field.rest[i3] + Math.sin(wave * 0.23 + i) * 0.12,
          field.rest[i3 + 1] + Math.cos(wave * 0.17 + i * 0.4) * 0.08,
          field.rest[i3 + 2],
        );
      }
      pos.needsUpdate = true;
    }

    if (material.current) {
      if (elapsed < SETTLE_START_MS) {
        material.current.opacity = 0;
      } else {
        const breathe =
          elapsed >= SETTLE_END_MS
            ? Math.sin(((elapsed / 1000) * Math.PI * 2) / BREATHE_S) * BREATHE
            : 0;
        material.current.opacity = BASE_OPACITY + breathe;
      }
    }
  });

  return (
    <points ref={points} geometry={field.geometry}>
      <pointsMaterial
        ref={material}
        size={size}
        map={sprite}
        alphaMap={sprite}
        vertexColors
        transparent
        opacity={0}
        depthWrite={false}
        sizeAttenuation
        blending={AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

function LightSheet() {
  const sheet = useRef<Mesh>(null);
  const material = useRef<MeshStandardMaterial>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (sheet.current) {
      sheet.current.position.x = Math.sin(t * 0.11) * 1.4;
      sheet.current.position.y = Math.cos(t * 0.09) * 0.45;
      sheet.current.rotation.z = Math.sin(t * 0.07) * 0.15;
    }
    if (material.current) {
      material.current.opacity = 0.07 + Math.sin(t * 0.2) * 0.015;
    }
  });

  return (
    <mesh ref={sheet} position={[0, 0, -3.2]}>
      <circleGeometry args={[5.5, 48]} />
      <meshStandardMaterial
        ref={material}
        color="#12304f"
        roughness={1}
        metalness={0}
        transparent
        opacity={0.07}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

function DriftField({ sprite }: { sprite: CanvasTexture }) {
  const heroRef = useRef<HTMLElement | null>(null);

  useFrame((state) => {
    const pose = framePose(state.clock.elapsedTime, window.scrollY);
    state.camera.position.set(pose.camX, pose.camY, pose.camZ);
    state.camera.lookAt(0, pose.lookY, 0);
    if (!heroRef.current) {
      const found = document.querySelector(".landing-hero");
      heroRef.current = found instanceof HTMLElement ? found : null;
    }
    const hero = heroRef.current;
    if (!hero) return;
    hero.style.setProperty("--frame-rx", `${pose.rx.toFixed(3)}deg`);
    hero.style.setProperty("--frame-ry", `${pose.ry.toFixed(3)}deg`);
    hero.style.setProperty("--frame-tz", `${pose.tz.toFixed(2)}px`);
  });

  useEffect(() => {
    return () => {
      const hero = heroRef.current ?? document.querySelector(".landing-hero");
      if (!(hero instanceof HTMLElement)) return;
      hero.style.removeProperty("--frame-rx");
      hero.style.removeProperty("--frame-ry");
      hero.style.removeProperty("--frame-tz");
    };
  }, []);

  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[3.2, 2.4, 4]} intensity={1.1} color="#4f9fe8" />
      <LightSheet />
      {PLANES.map((plane) => (
        <DepthPlane key={plane.salt} z={plane.z} size={plane.size} salt={plane.salt} sprite={sprite} />
      ))}
    </>
  );
}

/** Landing-only WebGL wash. Never import from feed, auth, or app chrome. */
export default function LandingAtmosphere() {
  const sprite = useMemo(() => makeAlphaMap(), []);

  useEffect(() => () => sprite.dispose(), [sprite]);

  return (
    <div className="landing-atmosphere" aria-hidden>
      <Canvas
        dpr={[1, 1.25]}
        camera={{ position: [0, 0, 8], fov: 48 }}
        gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
        style={{ pointerEvents: "none", width: "100%", height: "100%" }}
      >
        <DriftField sprite={sprite} />
      </Canvas>
    </div>
  );
}
