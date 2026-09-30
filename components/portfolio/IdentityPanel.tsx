import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import Avatar from "@/components/ui/Avatar";
import { Chip, StageChip } from "@/components/ui/Chip";
import { SectionLabel } from "@/components/ui/SectionLabel";
import UserBadges from "@/components/profile/UserBadges";
import { FOCUS_AREAS, FOCUS_LABELS, STAGE_LABELS, parseStage } from "@/lib/stage";
import OpenToTags from "./OpenToTags";
import ResumeLinks from "./ResumeLinks";

type IdentityPanelProps = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  pro: boolean;
  priority?: boolean;
  badges: ComponentProps<typeof UserBadges>;
  headline: string | null;
  tagline: string | null; // "Role at Org · Field at School", logged-in only
  stage: string | null;
  focusAreas: readonly string[];
  schoolLine: string | null;
  openTo: readonly string[];
  inviteDm: boolean;
  links: { github: string | null; linkedin: string | null; website: string | null } | null;
  counts?: { posts: number; followers: number; following: number };
  nameAs?: "h1" | "h3"; // h3 when embedded in another page (landing examples)
  actions: ReactNode;
};

function Row({ label, className = "", children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 text-[13px] ${className}`.trim()}>
      <SectionLabel as="dt" className="shrink-0">
        {label}
      </SectionLabel>
      <dd className="min-w-0 text-right text-[var(--ink)]">{children}</dd>
    </div>
  );
}

function Count({ n }: { n: number }) {
  // Pro accent colors the numbers, same as the old Stat.
  return <span className="text-[color:var(--profile-accent,currentColor)]">{n.toLocaleString()}</span>;
}

/** Left column of the portfolio: who, where, how to reach them. */
export default function IdentityPanel({
  username,
  displayName,
  avatarUrl,
  pro,
  priority = false,
  badges,
  headline,
  tagline,
  stage,
  focusAreas,
  schoolLine,
  openTo,
  inviteDm,
  links,
  counts,
  nameAs = "h1",
  actions,
}: IdentityPanelProps) {
  const Name = nameAs;
  const s = parseStage(stage);
  const areas = FOCUS_AREAS.filter((a) => focusAreas.includes(a));
  const hasOpenTo = openTo.length > 0;
  // Stage and focus rows are desktop only (chips replace them below xl).
  const hasPhoneRows = Boolean(schoolLine || hasOpenTo);
  const hasTable = hasPhoneRows || Boolean(s || areas.length > 0);

  return (
    <div className="flex flex-col gap-[18px] xl:gap-5">
      <div className="w-fit rounded-full bg-[linear-gradient(145deg,rgba(255,255,255,0.4),color-mix(in_srgb,var(--profile-accent,var(--accent))_40%,transparent))] p-0.5">
        <Avatar
          src={avatarUrl}
          seed={username}
          name={displayName}
          pro={pro}
          priority={priority}
          className="h-[72px] w-[72px] rounded-full text-[28px] xl:h-[108px] xl:w-[108px] xl:text-[40px]"
        />
      </div>

      <div className="flex flex-col gap-1.5 xl:gap-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Name className="text-balance text-[32px] font-semibold leading-[1.02] tracking-[-0.035em] xl:text-[44px] xl:leading-none xl:tracking-[-0.04em]">
            {displayName}
          </Name>
          <UserBadges {...badges} />
        </div>
        <p className="text-[13px] text-[var(--faint)]">@{username}</p>
        {headline && <p className="text-pretty text-base leading-[1.4] text-[var(--ink-3)] xl:text-lg">{headline}</p>}
        {tagline && <p className="text-sm text-[var(--muted)]">{tagline}</p>}
      </div>

      {(s || areas.length > 0) && (
        <div className="flex flex-wrap gap-1.5 xl:hidden">
          {s && <StageChip stage={s} label={STAGE_LABELS[s]} size="md" />}
          {areas.map((a) => (
            <Chip key={a} size="md">
              {FOCUS_LABELS[a]}
            </Chip>
          ))}
        </div>
      )}

      {hasTable && (
        <dl
          className={`${hasPhoneRows ? "flex" : "hidden xl:flex"} flex-col gap-2.5 rounded-2xl border border-[var(--border)] bg-[var(--fill-1)] p-4`}
        >
          {s && (
            <Row label="Stage" className="hidden xl:flex">
              <StageChip stage={s} label={STAGE_LABELS[s]} />
            </Row>
          )}
          {areas.length > 0 && (
            <Row label="Focus" className="hidden xl:flex">
              {areas.map((a) => FOCUS_LABELS[a]).join(" · ")}
            </Row>
          )}
          {schoolLine && <Row label="School">{schoolLine}</Row>}
          {hasOpenTo && (
            <Row label="Open to">
              <OpenToTags tags={openTo} username={username} linkToDm={inviteDm} className="text-right" />
            </Row>
          )}
        </dl>
      )}

      <div className="flex flex-wrap items-center gap-2">{actions}</div>

      {links && <ResumeLinks {...links} />}

      {counts && (
        <p className="text-[13px] tabular-nums text-[var(--faint)]">
          <Link href={`/profile/${username}/followers`} className="hover:text-[var(--ink)]">
            <Count n={counts.followers} /> followers
          </Link>
          {" · "}
          <Link href={`/profile/${username}/following`} className="hover:text-[var(--ink)]">
            <Count n={counts.following} /> following
          </Link>
          {" · "}
          <Count n={counts.posts} /> posts
        </p>
      )}
    </div>
  );
}
