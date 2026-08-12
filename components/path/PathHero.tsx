import type { ReactNode } from "react";
import type { PathPlanUi } from "@/lib/path/types";

const RECIPE_MARK: Record<PathPlanUi["ui_recipe"], string> = {
  studio: "Studio",
  ops_desk: "Ops desk",
  prep_room: "Prep room",
  focus_track: "Focus track",
  network_gap: "Network gap",
};

export default function PathHero({
  plan,
  children,
}: {
  plan: PathPlanUi;
  children?: ReactNode;
}) {
  return (
    <header
      data-tone={plan.tone}
      className="relative overflow-hidden rounded-none border-b border-[var(--border)] pb-8 pt-2 md:pb-10"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(120% 80% at 0% 0%, var(--blue-glow), transparent 55%), linear-gradient(180deg, var(--featured-surface), transparent 70%)",
        }}
      />
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--blue)]">
        samehere · {RECIPE_MARK[plan.ui_recipe]}
      </p>
      <h1 className="mt-3 max-w-2xl text-[2rem] font-semibold leading-[1.05] tracking-[-0.035em] text-[var(--ink)] md:text-[2.75rem] md:tracking-[-0.04em]">
        {plan.headline}
      </h1>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-[var(--ink-muted)] md:text-[17px]">
        {plan.why}
      </p>
      {children ? <div className="mt-6">{children}</div> : null}
    </header>
  );
}
