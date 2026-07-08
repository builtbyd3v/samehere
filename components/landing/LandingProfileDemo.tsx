"use client";

import ContributionHeatmap from "@/components/profile/ContributionHeatmap";
import { IconBolt, IconCrown, IconFlag } from "@/components/icons";
import { buildDemoHeatmap, DEMO_PROFILE } from "@/lib/landing/demo-data";
import Reveal from "./Reveal";
import { landingH2 } from "@/lib/landing/styles";

const heatmap = buildDemoHeatmap(DEMO_PROFILE.username);

export default function LandingProfileDemo() {
  const p = DEMO_PROFILE;
  const meta = [p.school, p.year, p.major].filter(Boolean).join(" · ") || p.role;

  return (
    <section id="features" className="scroll-mt-[5.5rem] border-y border-[var(--border)]">
      <div className="mx-auto max-w-2xl px-5 py-20">
        <Reveal>
          <h2 className={`text-balance ${landingH2}`}>Your profile, not your résumé.</h2>
          <p className="mt-4 max-w-[42ch] text-base leading-relaxed text-[var(--ink-muted)]">
            Skills, goals, and a contribution heatmap that tracks real activity: posts, comments, and connections.
          </p>
        </Reveal>

        <Reveal className="mt-10 flex flex-col gap-3" delay={0.08}>
          {/* Identity card */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-5 sm:p-6">
            <header className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <img
                src={`https://picsum.photos/seed/${p.avatarSeed}/160/160`}
                alt=""
                className="h-20 w-20 shrink-0 rounded-full border border-[var(--border)] object-cover sm:h-24 sm:w-24"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                      <h3 className="text-xl font-semibold tracking-[-0.02em] sm:text-2xl">{p.name}</h3>
                      {p.showFounderBadge && (
                        <span title="Founder badge · first 100 signed-up users" className="text-[var(--blue)]">
                          <IconCrown />
                        </span>
                      )}
                      {p.showCampusFounderBadge && (
                        <span title="Campus Founder badge · refer 100 students from your campus" className="text-[var(--founder)]">
                          <IconFlag />
                        </span>
                      )}
                      {p.showProBadge && (
                        <span title="Pro member" className="text-[var(--blue)]">
                          <IconBolt />
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[15px] text-[var(--ink-muted)]">@{p.username}</p>
                    {meta && <p className="mt-2 text-sm text-[var(--ink-muted)]">{meta}</p>}
                    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                      <span>
                        <b className="font-semibold text-[var(--ink)]">{p.posts}</b>{" "}
                        <span className="text-[var(--ink-muted)]">posts</span>
                      </span>
                      <span>
                        <b className="font-semibold text-[var(--ink)]">{p.followers}</b>{" "}
                        <span className="text-[var(--ink-muted)]">followers</span>
                      </span>
                      <span>
                        <b className="font-semibold text-[var(--ink)]">{p.following}</b>{" "}
                        <span className="text-[var(--ink-muted)]">following</span>
                      </span>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full border border-[var(--border-strong)] px-4 py-1.5 text-sm font-medium">
                    Edit profile
                  </span>
                </div>
              </div>
            </header>

            <p className="mt-5 max-w-[65ch] whitespace-pre-line break-words text-[16px] leading-[1.55] text-[var(--ink)]">
              {p.bio}
            </p>

            {p.goals && (
              <div className="mt-5 border-t border-[var(--border)] pt-5">
                <p className="text-sm font-semibold text-[var(--ink)]">Goals</p>
                <p className="mt-1.5 max-w-[65ch] whitespace-pre-line break-words text-[15px] leading-[1.55] text-[var(--ink-muted)]">
                  {p.goals}
                </p>
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--border)] pt-5">
              {p.skills.map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-[var(--border)] bg-[var(--canvas)] px-3 py-1 text-sm text-[var(--ink-muted)]"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Activity card */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-5 sm:p-6">
            <h4 className="mb-4 text-sm font-semibold text-[var(--ink)]">Activity</h4>
            <ContributionHeatmap data={heatmap} animate />
          </div>

          <p className="text-center text-xs text-[var(--ink-muted)]">
            Hover a day to see points. Same as on every profile.
          </p>
          <p className="text-center text-xs text-[var(--ink-muted)]">
            Refer 100 students from your campus and earn the Campus Founder badge.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
