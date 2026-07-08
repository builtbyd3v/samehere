"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";
import Reveal from "./Reveal";

const CLAIMS = [".edu only", "0 fake followers", "52 weeks tracked"] as const;

// easeOutQuint — confident deceleration, matches the page's motion curve.
const easeOutQuint = (p: number) => 1 - Math.pow(1 - p, 5);

function Count({ to }: { to: number }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [n, setN] = useState(0);

  useEffect(() => {
    if (reduce) {
      setN(to);
      return;
    }
    if (!inView) return;
    let raf = 0;
    let start = 0;
    const dur = 900;
    const tick = (t: number) => {
      if (!start) start = t;
      const p = Math.min((t - start) / dur, 1);
      setN(Math.round(easeOutQuint(p) * to));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduce, to]);

  return <span ref={ref}>{n}</span>;
}

/** Leading integer (if any) counts up; the rest is static text. */
function Claim({ text }: { text: string }) {
  const m = text.match(/^(\d+)(.*)$/);
  if (!m) return <>{text}</>;
  return (
    <>
      <Count to={parseInt(m[1], 10)} />
      {m[2]}
    </>
  );
}

export default function StatsBar() {
  return (
    <section className="border-y border-[var(--border)]">
      <Reveal className="mx-auto max-w-[1200px] px-5 py-6">
        <p className="text-center text-sm leading-relaxed text-[var(--ink-muted)]">
          {CLAIMS.map((c, i) => (
            <span key={c}>
              {i > 0 && <span className="mx-3 text-[var(--ink-faint)]">·</span>}
              <Claim text={c} />
            </span>
          ))}
        </p>
      </Reveal>
    </section>
  );
}
