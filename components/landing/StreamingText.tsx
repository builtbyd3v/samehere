"use client";

import { useEffect, useState, type ReactNode } from "react";

// Source: https://www.beautifului.dev/ — adapted to SameHere interview feedback.
const RESPONSE =
  "Your robotics project already proves that you can scope a system and recover when the first approach breaks. Lead with the failed assumption, then name the decision you changed.";
const STREAM_CHUNKS = RESPONSE.match(/\S+\s*/g) ?? [RESPONSE];
const CHUNK_INTERVAL_MS = 52;

const FOLLOW_UPS = [
  "Practice the answer out loud",
  "Show me a stronger project example",
];

const SOURCES = [
  { name: "Robotics project", detail: "profile" },
  { name: "Role requirements", detail: "listing" },
  { name: "Application notes", detail: "tracker" },
] as const;

const ACTIONS: { label: string; icon: ReactNode }[] = [
  {
    label: "Copy feedback",
    icon: (
      <g>
        <rect x="9" y="9" width="12" height="12" rx="2.5" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </g>
    ),
  },
  {
    label: "Try again",
    icon: <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" />,
  },
  {
    label: "Helpful",
    icon: (
      <path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
    ),
  },
  {
    label: "Not helpful",
    icon: (
      <path d="M17 14V2M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" />
    ),
  },
];

function useStreamedResponse() {
  const [visibleCount, setVisibleCount] = useState(0);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    let frameId = 0;
    let finished = false;

    const finish = () => {
      finished = true;
      setVisibleCount(STREAM_CHUNKS.length);
      setComplete(true);
    };

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches || document.visibilityState === "hidden") {
      frameId = requestAnimationFrame(finish);
      return () => cancelAnimationFrame(frameId);
    }

    const startedAt = performance.now();
    const advance = (now: number) => {
      const nextCount = Math.min(
        STREAM_CHUNKS.length,
        Math.floor((now - startedAt) / CHUNK_INTERVAL_MS) + 1,
      );

      setVisibleCount((current) =>
        current === nextCount ? current : nextCount,
      );

      if (nextCount < STREAM_CHUNKS.length) {
        frameId = requestAnimationFrame(advance);
      } else {
        finish();
      }
    };

    const finishIfHidden = () => {
      if (document.visibilityState !== "hidden" || finished) return;
      cancelAnimationFrame(frameId);
      finish();
    };

    document.addEventListener("visibilitychange", finishIfHidden);
    frameId = requestAnimationFrame(advance);

    return () => {
      document.removeEventListener("visibilitychange", finishIfHidden);
      cancelAnimationFrame(frameId);
    };
  }, []);

  return {
    complete,
    text: STREAM_CHUNKS.slice(0, visibleCount).join(""),
  };
}

export default function StreamingText({
  compact = false,
}: {
  compact?: boolean;
}) {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const { complete, text } = useStreamedResponse();

  return (
    <div
      className={`landing-stream ${compact ? "landing-stream-compact" : ""}`}
      data-complete={complete}
    >
      <div className="landing-stream-copy">
        <span className="sr-only">{RESPONSE}</span>
        <p aria-hidden className="landing-stream-text">
          {text}
          <span className="landing-stream-caret" />
        </p>
      </div>

      <div className="landing-stream-context">
        <span aria-hidden className="landing-stream-context-mark" />
        <span>Grounded in your robotics project</span>
      </div>

      <div className="landing-stream-toolbar" data-visible={complete}>
        <div className="landing-stream-actions">
          {ACTIONS.map((action) => (
            <button
              key={action.label}
              type="button"
              aria-label={action.label}
              tabIndex={complete ? 0 : -1}
              className="landing-stream-action"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {action.icon}
              </svg>
            </button>
          ))}
        </div>

        {compact ? (
          <span className="landing-stream-source-count">3 sources</span>
        ) : (
          <button
            type="button"
            aria-expanded={sourcesOpen}
            onClick={() => setSourcesOpen((current) => !current)}
            tabIndex={complete ? 0 : -1}
            className="landing-stream-source-button"
          >
            <span className="landing-stream-source-dots" aria-hidden>
              {SOURCES.map((source, index) => (
                <span key={source.name} style={{ opacity: 1 - index * 0.2 }} />
              ))}
            </span>
            <span>3 sources</span>
          </button>
        )}
      </div>

      {!compact ? (
        <>
          <div
            className="landing-stream-sources"
            data-open={sourcesOpen}
          >
            <div>
              <div>
                {SOURCES.map((source) => (
                  <div key={source.name}>
                    <span aria-hidden />
                    <span>{source.name}</span>
                    <span>{source.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="landing-stream-followups" data-visible={complete}>
            <p>Follow-ups</p>
            <div>
              {FOLLOW_UPS.map((followUp) => (
                <button key={followUp} type="button">
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="m9 10-5 5 5 5" />
                    <path d="M20 4v7a4 4 0 0 1-4 4H4" />
                  </svg>
                  {followUp}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
