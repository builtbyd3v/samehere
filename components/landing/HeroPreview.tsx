import Link from "next/link";
import PostCard, { type FeedPost } from "@/components/feed/PostCard";
import IdentityPanel from "@/components/portfolio/IdentityPanel";
import ProjectCard from "@/components/portfolio/ProjectCard";
import { Button } from "@/components/ui/Button";
import { HairlineCard } from "@/components/ui/HairlineCard";
import { SectionLabel } from "@/components/ui/SectionLabel";
import type { LandingExample } from "@/lib/landing/examples";
import { CARD_SIZES, cardPath } from "@/lib/portfolio/card-format";
import { EXAMPLE_PORTFOLIO, EXAMPLE_VIEWER_ID, examplePost } from "./example-content";

const FLOAT_SHADOW = "shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)]";
const THUMB = "h-40 w-auto rounded-xl border border-[var(--hairline)] md:h-48";
const URL_TEXT = "min-w-0 truncate font-mono text-[11px] text-[var(--faint)]";

/** A real export PNG from /profile/<username>/card. */
export function ExportImage({ username, displayName, format, className }: {
  username: string;
  displayName: string;
  format: "story" | "square";
  className: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- our own PNG route at a fixed size; next/image would re-encode it
    <img
      src={cardPath(username, format)}
      width={CARD_SIZES[format].width}
      height={CARD_SIZES[format].height}
      alt={`${displayName}'s portfolio exported as a ${format} image`}
      loading="lazy"
      decoding="async"
      className={className}
    />
  );
}

function ExamplePost({ post }: { post: FeedPost }) {
  return (
    <HairlineCard radius={20} className={FLOAT_SHADOW} innerClassName="px-4">
      <figure aria-label="Example post">
        <figcaption className="pt-3.5">
          <SectionLabel>Example post</SectionLabel>
        </figcaption>
        {/* inert: an illustration, not a live post. Nothing inside is focusable, clickable, or read out. */}
        <div inert>
          <PostCard post={post} viewerId={EXAMPLE_VIEWER_ID} />
        </div>
      </figure>
    </HairlineCard>
  );
}

function ExamplePanels({ e, action }: { e: LandingExample; action: boolean }) {
  return (
    <>
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
        links={null}
        nameAs="h3"
        actions={
          action ? (
            <Button href={`/profile/${e.username}`} variant="secondary" size="sm">
              Open portfolio
            </Button>
          ) : null
        }
      />
      <ProjectCard project={e.project} />
    </>
  );
}

export default function HeroPreview({ example, postCreatedAt }: { example: LandingExample | null; postCreatedAt: string }) {
  const post = examplePost(postCreatedAt);
  return (
    <div id={example ? "examples" : undefined} className="relative mx-auto mt-11 max-w-[1440px] scroll-mt-6 px-4 md:mt-[72px] md:px-8 xl:px-16">
      <div className="relative mx-auto max-w-[720px]">
        {example ? (
          <ExportImage
            username={example.username}
            displayName={example.displayName}
            format="story"
            className={`landing-loop absolute right-[calc(100%-72px)] top-[72px] hidden h-auto w-[220px] -rotate-6 rounded-[20px] border border-[var(--hairline-strong)] ${FLOAT_SHADOW} motion-safe:animate-[landing-float_7s_ease-in-out_infinite] xl:block`}
          />
        ) : null}
        <HairlineCard radius={24} className="relative z-10 shadow-[0_60px_120px_-30px_rgba(0,0,0,0.9)]">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--hairline)] px-5 py-3 md:px-7">
            <SectionLabel as="h2">{example ? "Live portfolio" : "Example portfolio"}</SectionLabel>
            {example ? (
              <Link href={`/profile/${example.username}`} prefetch={false} className={`${URL_TEXT} hover:text-[var(--ink)]`}>
                samehere.dev/profile/{example.username}
              </Link>
            ) : (
              <span className={URL_TEXT}>samehere.dev/profile/yourname</span>
            )}
          </div>
          <div className="grid gap-6 p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:p-7">
            <ExamplePanels e={example ?? EXAMPLE_PORTFOLIO} action={example !== null} />
          </div>
        </HairlineCard>
        {/* 390px: the example post's author line and reaction row fit untruncated. Low and 130px in, it covers only the
            empty lower right of the frame and stays inside a 1280 viewport. */}
        <div className={`landing-loop absolute left-[calc(100%-130px)] top-[360px] z-20 hidden w-[390px] rotate-[5deg] motion-safe:animate-[landing-float-alt_8s_ease-in-out_infinite] xl:block`}>
          <ExamplePost post={post} />
        </div>
      </div>
      {/* Below xl: same pieces, stacked, no tilt, no motion. */}
      <div className="mx-auto mt-4 flex max-w-[720px] flex-col gap-4 xl:hidden">
        {example ? (
          <div className="flex items-end gap-3">
            <ExportImage username={example.username} displayName={example.displayName} format="story" className={THUMB} />
            <ExportImage username={example.username} displayName={example.displayName} format="square" className={THUMB} />
          </div>
        ) : null}
        <div className="hidden md:block">
          <ExamplePost post={post} />
        </div>
      </div>
    </div>
  );
}

/** Compact cards for the other qualifying accounts, so every public example still shows (advisor decision, plan 026). */
export function MoreExamples({ examples }: { examples: LandingExample[] }) {
  if (examples.length === 0) return null;
  return (
    <section className="mx-auto mt-10 max-w-[1440px] px-4 md:mt-14 md:px-8 xl:px-16">
      <div className="mx-auto max-w-[720px]">
        <SectionLabel as="h2" className="mb-4 block">
          More portfolios
        </SectionLabel>
        <ul className="grid gap-4">
          {examples.map((e) => (
            <li
              key={e.username}
              className="grid gap-6 rounded-3xl border border-[var(--border)] bg-[var(--surface-1)] p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:p-7"
            >
              <ExamplePanels e={e} action />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
