import { MessageCircle } from "lucide-react";
import { Chip, StageChip } from "@/components/ui/Chip";
import { HairlineCard } from "@/components/ui/HairlineCard";
import { MonoLabel } from "@/components/ui/MonoLabel";
import { FOCUS_LABELS, STAGE_LABELS } from "@/lib/stage";

// Illustration only. Placeholder identity on purpose: never a real or realistic person.
const NAME = "Your name";
const HEADLINE = "CS sophomore building small tools for students";
const URL_TEXT = "samehere.dev/profile/yourname";
const PROJECTS = [
  { name: "Study timer", blurb: "Shared study timers for remote classmates" },
  { name: "Dining menu API", blurb: "Dining hall menus as a JSON API" },
] as const;
const SKILLS = ["TypeScript", "React", "Python", "Postgres", "Swift"] as const;

// Same deterministic pattern as the artboard: 104 cells, 26 columns. Not real activity.
const HEAT = ["bg-[var(--hm0)]", "bg-[var(--hm1)]", "bg-[var(--hm2)]", "bg-[var(--hm3)]"] as const;
const CELLS = Array.from({ length: 104 }, (_, i) => {
  const v = (i * 37 + (i % 7) * 11) % 13;
  return HEAT[v < 6 ? 0 : v < 9 ? 1 : v < 11 ? 2 : 3];
});

const LABEL = "Example of a samehere profile and a Stuck post. Illustration, not a real account.";

const FLOAT_SHADOW = "shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)]";

function Chips({ ai = false }: { ai?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <StageChip stage="internship_search" label={STAGE_LABELS.internship_search} />
      <Chip>{FOCUS_LABELS.web}</Chip>
      {ai ? <Chip>{FOCUS_LABELS.ai_ml}</Chip> : null}
    </div>
  );
}

export default function HeroPreview() {
  return (
    <div role="img" aria-label={LABEL} className="relative mt-11 px-4 md:mt-[72px] md:px-8">
      {/* Phone: one profile card. */}
      <HairlineCard
        glow
        radius={24}
        className="shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)] md:hidden"
        innerClassName="flex flex-col gap-3 p-[22px]"
      >
        <div className="size-[52px] rounded-full bg-[var(--hm2)]" />
        <p className="text-2xl font-semibold tracking-[-0.03em]">{NAME}</p>
        <p className="text-sm text-[var(--ink-3)]">{HEADLINE}</p>
        <Chips />
        <div className="my-1.5 h-px bg-[var(--hairline)]" />
        <p className="text-sm font-semibold">{PROJECTS[0].name}</p>
        <p className="-mt-2 text-[13px] text-[var(--muted)]">{PROJECTS[0].blurb}</p>
        <MonoLabel className="break-all">{URL_TEXT}</MonoLabel>
      </HairlineCard>

      {/* Tablet: browser card alone. Desktop (xl): story card, browser card, Stuck card. */}
      <div className="relative mx-auto hidden md:block md:max-w-[520px] xl:h-[640px] xl:w-[970px] xl:max-w-none">
        <div className="absolute left-0 top-[90px] hidden h-[520px] w-[300px] -rotate-6 animate-[landing-float_7s_ease-in-out_infinite] motion-reduce:animate-none xl:block">
          <HairlineCard glow radius={28} className={`h-full ${FLOAT_SHADOW}`} innerClassName="flex flex-col gap-3.5 p-[26px]">
            <p className="text-xs font-semibold text-[var(--ink-3)]">samehere</p>
            <div className="mt-[30px] size-14 rounded-full bg-[var(--hm2)]" />
            <p className="text-[26px] font-semibold leading-[1.05] tracking-[-0.03em]">{NAME}</p>
            <p className="text-sm text-[var(--ink-3)]">{HEADLINE}</p>
            <Chips />
            <div className="grow" />
            <MonoLabel className="break-all">{URL_TEXT}</MonoLabel>
          </HairlineCard>
        </div>

        <HairlineCard
          radius={24}
          className="relative z-10 shadow-[0_60px_120px_-30px_rgba(0,0,0,0.9),0_0_0_1px_rgba(0,0,0,0.4)] xl:absolute xl:left-[210px] xl:top-5 xl:h-[600px] xl:w-[520px]"
        >
          <div className="flex h-10 items-center gap-1.5 border-b border-[var(--hairline)] px-4">
            <span className="size-2.5 rounded-full bg-[#2a2c30]" />
            <span className="size-2.5 rounded-full bg-[#2a2c30]" />
            <span className="size-2.5 rounded-full bg-[#2a2c30]" />
            <span className="ml-3 font-mono text-[11px] text-[var(--faint)]">{URL_TEXT}</span>
          </div>
          <div className="flex flex-col gap-[18px] p-7">
            <div className="flex items-center gap-3.5">
              <div className="size-[52px] shrink-0 rounded-full bg-[var(--hm2)]" />
              <div>
                <p className="text-xl font-semibold tracking-[-0.02em]">{NAME}</p>
                <p className="text-[13px] text-[var(--muted)]">{HEADLINE}</p>
              </div>
            </div>
            <Chips ai />
            <div className="h-px bg-[var(--hairline)]" />
            <MonoLabel>Projects</MonoLabel>
            <div className="flex flex-col gap-3">
              {PROJECTS.map((p) => (
                <div key={p.name}>
                  <p className="text-sm font-semibold">{p.name}</p>
                  <p className="text-xs text-[var(--muted)]">{p.blurb}</p>
                </div>
              ))}
            </div>
            <MonoLabel>Skills</MonoLabel>
            <div className="flex flex-wrap gap-1.5">
              {SKILLS.map((s) => (
                <Chip key={s}>{s}</Chip>
              ))}
            </div>
            <MonoLabel>Activity</MonoLabel>
            <div className="grid grid-cols-[repeat(26,minmax(0,1fr))] gap-[3px]">
              {CELLS.map((bg, i) => (
                <div key={i} className={`aspect-square rounded-[2px] ${bg}`} />
              ))}
            </div>
          </div>
        </HairlineCard>

        <div className="absolute left-[680px] top-[130px] z-20 hidden w-[290px] rotate-[5deg] animate-[landing-float-alt_8s_ease-in-out_infinite] motion-reduce:animate-none xl:block">
          <HairlineCard radius={20} className={FLOAT_SHADOW} innerClassName="flex flex-col gap-3 p-[18px]">
            <div className="flex items-center gap-2">
              <Chip tone="amber">Stuck</Chip>
              <span className="text-xs text-[var(--muted)]">2h ago</span>
            </div>
            <p className="text-sm leading-[1.45]">Supabase RLS blocks my insert but the policy looks right. What am I missing?</p>
            <div className="flex items-center gap-2 rounded-xl border border-[var(--hairline)] p-2.5 text-xs text-[var(--muted)]">
              <MessageCircle size={16} aria-hidden />
              Answered by someone one stage ahead
            </div>
          </HairlineCard>
        </div>
      </div>
    </div>
  );
}
