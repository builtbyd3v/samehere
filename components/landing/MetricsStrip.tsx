"use client";

import Link from "next/link";
import gsap from "gsap";
import { useLayoutEffect, useRef } from "react";
import { signupCta } from "./cta";

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
 * Conversion strip — reasons to sign up, not abstract product poetry.
 * Middle slot stays the accent figure in CSS (:nth-child(2)).
 */
const METRICS: readonly Metric[] = [
  {
    kind: "text",
    display: "Free",
    label: "Diagnose where you're stuck and get a path today",
  },
  {
    kind: "text",
    display: "Ship",
    label: "Build real projects in-app that go on your resume",
  },
  {
    kind: "text",
    display: "Prep",
    label: "Company interview banks ready when you get the email",
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
    <section ref={sectionRef} className="landing-metrics" aria-label="Why join samehere">
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
      <div className="landing-metrics-cta">
        <Link href="/signup" className={signupCta}>
          Join free
        </Link>
      </div>
    </section>
  );
}
