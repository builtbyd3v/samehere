"use client";

import gsap from "gsap";
import { useLayoutEffect, useRef } from "react";

const METRICS = [
  { value: 9, label: "projects that fill a blank resume" },
  { value: 10, label: "company interview packs before the OA" },
  { value: 0, label: "connections required to start" },
] as const;

export default function MetricsStrip() {
  const sectionRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const figures = Array.from(
      section.querySelectorAll<HTMLElement>("[data-metric-value]"),
    );
    const labels = Array.from(
      section.querySelectorAll<HTMLElement>("[data-metric-label]"),
    );
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      figures.forEach((figure) => {
        figure.textContent = figure.dataset.metricValue ?? "0";
      });
      return;
    }

    const timeline = gsap.timeline({ paused: true });
    timeline.fromTo(
      figures,
      { opacity: 0, y: 18, rotateX: -25 },
      {
        opacity: 1,
        y: 0,
        rotateX: 0,
        duration: 0.7,
        stagger: 0.09,
        ease: "power3.out",
      },
    );
    timeline.fromTo(
      labels,
      { opacity: 0, y: 8 },
      {
        opacity: 1,
        y: 0,
        duration: 0.45,
        stagger: 0.08,
        ease: "power3.out",
      },
      "-=0.42",
    );

    const counters = figures.map((figure) => {
      const target = Number(figure.dataset.metricValue ?? 0);
      const state = { value: 0 };
      return gsap.to(state, {
        value: target,
        duration: 1.25,
        paused: true,
        snap: { value: 1 },
        ease: "power3.out",
        onUpdate: () => {
          figure.textContent = String(Math.round(state.value));
        },
      });
    });

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        timeline.play(0);
        counters.forEach((counter) => counter.play(0));
        observer.disconnect();
      },
      { threshold: 0.35 },
    );
    observer.observe(section);

    return () => {
      observer.disconnect();
      timeline.kill();
      counters.forEach((counter) => counter.kill());
    };
  }, []);

  return (
    <section ref={sectionRef} className="landing-metrics" aria-label="Why students use samehere">
      <div aria-hidden className="landing-metrics-grid" />
      <div aria-hidden className="landing-metrics-streaks">
        <span className="landing-metrics-streak landing-metrics-streak-h1" />
        <span className="landing-metrics-streak landing-metrics-streak-h2" />
        <span className="landing-metrics-streak landing-metrics-streak-v1" />
        <span className="landing-metrics-streak landing-metrics-streak-v2" />
      </div>
      <div className="landing-metrics-inner">
        {METRICS.map((metric) => (
          <div key={metric.label} className="landing-metric">
            <p
              data-metric-value={metric.value}
              className="landing-metric-value"
            >
              {metric.value}
            </p>
            <p data-metric-label className="landing-metric-label">
              {metric.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
