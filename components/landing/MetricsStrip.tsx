"use client";

import gsap from "gsap";
import { useLayoutEffect, useRef } from "react";

type Metric =
  | {
      kind: "count";
      value: number;
      suffix: string;
      label: string;
    }
  | {
      kind: "text";
      display: string;
      label: string;
    };

/**
 * Sell the internship outcome. Keep inventory counts out — they read small.
 * Middle slot stays the accent figure in CSS (:nth-child(2)).
 *
 * Sides: blank resume → apply proof, and interview-loop prep.
 * Labels are full phrases so the strip reads without decoding.
 */
const METRICS: readonly Metric[] = [
  {
    kind: "text",
    display: "0 to 1",
    label: "From a blank resume to apply-ready proof",
  },
  {
    kind: "count",
    value: 100,
    suffix: "%",
    label: "Build, apply, and prepare fully in-app",
  },
  {
    kind: "text",
    display: "Prep",
    label: "Takes over the moment you land an interview",
  },
];

function formatCount(value: number, suffix: string) {
  return `${Math.round(value)}${suffix}`;
}

function initialText(metric: Metric) {
  if (metric.kind === "text") return metric.display;
  return formatCount(metric.value, metric.suffix);
}

export default function MetricsStrip() {
  const sectionRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const figures = Array.from(
      section.querySelectorAll<HTMLElement>("[data-metric-figure]"),
    );
    const labels = Array.from(
      section.querySelectorAll<HTMLElement>("[data-metric-label]"),
    );
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      figures.forEach((figure) => {
        if (figure.dataset.metricKind === "count") {
          const target = Number(figure.dataset.metricValue ?? 0);
          const suffix = figure.dataset.metricSuffix ?? "";
          figure.textContent = formatCount(target, suffix);
        } else {
          figure.textContent = figure.dataset.metricDisplay ?? "";
        }
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

    const counters = figures
      .filter((figure) => figure.dataset.metricKind === "count")
      .map((figure) => {
        const target = Number(figure.dataset.metricValue ?? 0);
        const suffix = figure.dataset.metricSuffix ?? "";
        const state = { value: 0 };
        return gsap.to(state, {
          value: target,
          duration: 1.25,
          paused: true,
          snap: { value: 1 },
          ease: "power3.out",
          onUpdate: () => {
            figure.textContent = formatCount(state.value, suffix);
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
    <section ref={sectionRef} className="landing-metrics" aria-label="Why samehere for internships">
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
              data-metric-figure
              data-metric-kind={metric.kind}
              {...(metric.kind === "count"
                ? {
                    "data-metric-value": metric.value,
                    "data-metric-suffix": metric.suffix,
                  }
                : { "data-metric-display": metric.display })}
              className="landing-metric-value"
            >
              {initialText(metric)}
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
