"use client";

import ContributionHeatmap from "@/components/profile/ContributionHeatmap";
import { IconBolt, IconCrown } from "@/components/icons";
import { buildDemoHeatmap, DEMO_PROFILE } from "@/lib/landing/demo-data";
import Reveal from "./Reveal";

const heatmap = buildDemoHeatmap(DEMO_PROFILE.username);

const h2 = "text-[36px] font-semibold leading-[1.1] tracking-[-0.03em] md:text-[48px] md:tracking-[-0.03em]";

export default function LandingProfileDemo() {
  const p = DEMO_PROFILE;
  const meta = [p.school, p.year, p.major].filter(Boolean).join(" · ") || p.role;

  return (
    <section id="features" className="border-y border-[var(--border)]">
      <div className="mx-auto max-w-2xl px-5 py-20">
        <Reveal>
          <h2 className={`text-balance ${h2}`}>Your profile, not your résumé.</h2>
          <p className="mt-4 max-w-[42ch] text-base leading-relaxed text-[var(--ink-muted)]">
            Skills, goals, and a contribution heatmap that tracks real activity — posts, comments, and connections.
          </p>
        </Reveal>

        <Reveal className="mt-10" delay={0.08}>
          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            <div className="p-6">
              <header className="flex items-start gap-5">
                <img
                  src={`https://picsum.photos/seed/${p.avatarSeed}/160/160`}
                  alt=""
                  className="h-20 w-20 shrink-0 rounded-full border border-[var(--border)] object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="truncate text-2xl font-semibold tracking-[-0.02em]">{p.name}</h3>
                        {p.showFounderBadge && (
                          <span title="Founder badge · first 100 signed-up users" className="text-[var(--blue)]">
                            <IconCrown />
                          </span>
                        )}
                        {p.showProBadge && (
                          <span title="Pro member" className="text-[var(--blue)]">
                            <IconBolt />
                          </span>
                        )}
                      </div>
                      <p className="text-[15px] text-[var(--ink-muted)]">@{p.username}</p>
                      {meta && <p className="mt-1.5 text-sm text-[var(--ink-muted)]">{meta}</p>}
                      <div className="mt-4 flex gap-6 text-sm">
                        <span>
                          <b className="font-semibold">{p.posts}</b>{" "}
                          <span className="text-[var(--ink-muted)]">posts</span>
                        </span>
                        <span>
                          <b className="font-semibold">{p.followers}</b>{" "}
                          <span className="text-[var(--ink-muted)]">followers</span>
                        </span>
                        <span>
                          <b className="font-semibold">{p.following}</b>{" "}
                          <span className="text-[var(--ink-muted)]">following</span>
                        </span>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-md border border-[var(--border-strong)] px-3 py-1.5 text-sm font-medium">
                      Edit profile
                    </span>
                  </div>
                </div>
              </header>

              <p className="mt-6 whitespace-pre-line break-words text-[15px] leading-relaxed">{p.bio}</p>

              {p.goals && (
                <div className="mt-5">
                  <h4 className="text-xs font-medium uppercase tracking-wide text-[var(--ink-muted)]">Goals</h4>
                  <p className="mt-1.5 whitespace-pre-line break-words text-[15px] leading-relaxed">{p.goals}</p>
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                {p.skills.map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-[var(--border)] px-3 py-1 text-sm text-[var(--ink-muted)]"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <section className="border-t border-[var(--border)] p-6">
              <h4 className="mb-4 text-sm font-medium">Contribution heatmap</h4>
              <ContributionHeatmap data={heatmap} />
            </section>
          </div>

          <p className="mt-3 text-center text-xs text-[var(--ink-faint)]">
            Hover a day to see points — same as on every profile
          </p>
        </Reveal>
      </div>
    </section>
  );
}
