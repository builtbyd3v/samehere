"use client";

import { useActionState, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { portfolioPublishConflict } from "@/lib/portfolio/validation";
import { savePublicationAction, type ProjectActionState } from "@/app/(app)/profile/projects/actions";
import type { PortfolioSection, PortfolioSettings } from "@/types/portfolio";

const FLAGS = [
  ["publish_intro", "Introduction"],
  ["publish_projects", "Projects"],
  ["publish_activity", "Activity"],
  ["publish_experience", "Experience"],
  ["publish_education", "Education"],
  ["publish_posts", "Posts"],
  ["allow_indexing", "Allow search indexing"],
] as const;

const SECTION_LABELS: Record<PortfolioSection, string> = {
  intro: "Introduction",
  projects: "Projects",
  activity: "Activity",
  experience: "Experience",
  education: "Education",
  posts: "Posts",
};

export default function PublicationControls({
  settings,
  isPrivate,
  isPro,
}: {
  settings: PortfolioSettings;
  isPrivate: boolean;
  isPro: boolean;
}) {
  const [state, action, pending] = useActionState<ProjectActionState, FormData>(savePublicationAction, {});
  const [order, setOrder] = useState<PortfolioSection[]>(settings.section_order);
  const conflict = portfolioPublishConflict(isPrivate, settings);

  function move(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= order.length) return;
    setOrder((current) => {
      const copy = [...current];
      const [removed] = copy.splice(index, 1);
      copy.splice(next, 0, removed);
      return copy;
    });
  }

  return (
    <form action={action} className="card mt-6 p-5 sm:p-6">
      <h2 className="text-sm font-semibold text-[var(--ink)]">Publication</h2>
      <p className="mt-1 text-sm text-[var(--ink-muted)]">
        Existing sections stay private until you turn them on. A private account still hides them from the public page.
      </p>
      {conflict && (
        <p role="status" className="mt-3 text-sm text-[var(--ink)]">
          Your account is private, so these switches cannot make anything public until you change that in Settings.
        </p>
      )}
      {state.error && (
        <p role="alert" className="mt-3 text-sm text-[var(--danger)]">
          {state.error}
        </p>
      )}
      <ul className="mt-4 flex flex-col gap-3">
        {FLAGS.map(([name, label]) => (
          <li key={name}>
            <label className="flex items-center gap-2.5 text-sm text-[var(--ink)]">
              <input
                type="checkbox"
                name={name}
                defaultChecked={settings[name]}
                className="h-4 w-4 accent-[var(--ink)]"
              />
              {label}
            </label>
          </li>
        ))}
      </ul>
      <div className="mt-5 border-t border-[var(--border)] pt-4">
        <h3 className="text-sm font-semibold text-[var(--ink)]">Section order</h3>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          Introduction is your bio and tags. Your name and photo stay at the top.
        </p>
        {isPro ? (
          <ul className="mt-3 flex flex-col gap-2">
            {order.map((section, index) => (
              <li
                key={section}
                className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-3 py-2"
              >
                <span className="text-sm text-[var(--ink)]">{SECTION_LABELS[section]}</span>
                <span className="flex gap-1">
                  <button
                    type="button"
                    className="btn-ghost !px-2 !py-1"
                    aria-label={`Move ${SECTION_LABELS[section]} up`}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ChevronUp className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="btn-ghost !px-2 !py-1"
                    aria-label={`Move ${SECTION_LABELS[section]} down`}
                    disabled={index === order.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ChevronDown className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                  </button>
                </span>
                <input type="hidden" name="section_order" value={section} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            Custom order is a Pro perk. A saved order stays stored and returns if Pro is renewed.
          </p>
        )}
      </div>
      <button type="submit" disabled={pending} className="btn-primary mt-5 w-full">
        {pending ? "Saving…" : "Save publication"}
      </button>
    </form>
  );
}
