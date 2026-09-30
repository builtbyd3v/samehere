import IdentityPanel from "@/components/portfolio/IdentityPanel";
import ProjectCard from "@/components/portfolio/ProjectCard";
import { Button } from "@/components/ui/Button";
import type { LandingExample } from "@/lib/landing/examples";
import { CARD_SIZES, cardPath } from "@/lib/portfolio/card-format";

const CARD_IMG = "h-40 w-auto rounded-xl border border-[var(--hairline)] md:h-48";

export default function LandingExamples({ examples }: { examples: LandingExample[] }) {
  if (examples.length === 0) return null;
  return (
    <section
      id="examples"
      aria-labelledby="examples-title"
      className="mx-auto mt-16 max-w-[1440px] scroll-mt-6 px-4 md:mt-24 md:px-8 xl:px-16"
    >
      <h2
        id="examples-title"
        className="max-w-[24ch] text-balance text-[32px] font-semibold leading-[1.05] tracking-[-0.035em] md:text-[44px]"
      >
        Portfolios from students on samehere
      </h2>
      <p className="mt-3 max-w-[56ch] text-pretty text-base leading-[1.55] text-[var(--muted)]">
        Each card is a live samehere page and the images it exports.
      </p>
      <ul className={`mt-8 grid gap-4 ${examples.length > 1 ? "xl:grid-cols-2" : "max-w-[720px]"}`}>
        {examples.map((e) => (
          <li
            key={e.username}
            className="flex min-w-0 flex-col gap-6 rounded-3xl border border-[var(--border)] bg-[var(--surface-1)] p-5 md:p-7"
          >
            <IdentityPanel
              username={e.username}
              displayName={e.displayName}
              avatarUrl={e.avatarUrl}
              pro={e.badges.isPro}
              badges={e.badges}
              headline={e.headline}
              tagline={null}
              stage={e.stage}
              focusAreas={e.focusAreas}
              schoolLine={e.schoolLine}
              openTo={e.openTo}
              inviteDm={false}
              links={e.links}
              nameAs="h3"
              actions={
                <Button href={`/profile/${e.username}`} variant="secondary" size="sm">
                  Open portfolio
                </Button>
              }
            />
            <ProjectCard project={e.project} />
            <div className="flex items-end gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- our own PNG route at a fixed size; next/image would re-encode it */}
              <img
                src={cardPath(e.username, "story")}
                width={CARD_SIZES.story.width}
                height={CARD_SIZES.story.height}
                alt={`${e.displayName}'s portfolio exported as a story image`}
                loading="lazy"
                decoding="async"
                className={CARD_IMG}
              />
              {/* eslint-disable-next-line @next/next/no-img-element -- same as above */}
              <img
                src={cardPath(e.username, "square")}
                width={CARD_SIZES.square.width}
                height={CARD_SIZES.square.height}
                alt={`${e.displayName}'s portfolio exported as a square image`}
                loading="lazy"
                decoding="async"
                className={CARD_IMG}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
