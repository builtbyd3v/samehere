import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FeedSearchResults } from "@/components/feed/FeedSearch";
import FeedTimeline from "@/components/feed/FeedTimeline";
import SearchBar from "@/components/search/SearchBar";
import SearchIdle from "@/components/search/SearchIdle";
import {
  SEARCH_PAGE,
  tokensFor,
  searchPosts,
  searchProjects,
  parseSearchPage,
  searchPageOffset,
  searchHref,
  nextSearchOffset,
} from "@/lib/search";

const POSTS_PREVIEW = 3;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; peoplePage?: string; projectPage?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const peoplePage = parseSearchPage(params.peoplePage);
  const peopleOffset = searchPageOffset(peoplePage);
  const projectPage = parseSearchPage(params.projectPage);
  const projectOffset = searchPageOffset(projectPage);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const viewerId = user?.id ?? null;

  if (!q || !tokensFor(q).length) {
    return (
      <main className="page-enter mx-auto max-w-2xl px-4 py-8">
        <h1 className="sr-only">Search</h1>
        <SearchBar />
        <SearchIdle />
      </main>
    );
  }

  const [posts, projects] = await Promise.all([
    searchPosts(supabase, q, POSTS_PREVIEW + 1),
    searchProjects(supabase, q, SEARCH_PAGE, projectOffset),
  ]);

  const hasMorePosts = posts.length > POSTS_PREVIEW;
  const hasMoreProjects = projects.length === SEARCH_PAGE && nextSearchOffset(projectOffset) != null;
  const postItems = posts
    .slice(0, POSTS_PREVIEW)
    .map((post) => ({ kind: "post" as const, created_at: post.created_at, post }));
  const showProjects = projects.length > 0 || projectPage > 1;

  const peopleBlock = (
    <FeedSearchResults q={q} page={peoplePage} offset={peopleOffset} projectPage={projectPage} />
  );

  return (
    <main className="page-enter mx-auto max-w-2xl px-4 py-8">
      <h1 className="sr-only">Search results for {q}</h1>
      <SearchBar initialQuery={q} />

      <section className="mt-6" aria-labelledby="search-people-heading">
        <h2 id="search-people-heading" className="mb-3 text-sm font-semibold text-[var(--ink)]">
          People
        </h2>
        {peopleBlock}
      </section>

      {showProjects && (
        <section className="mt-6" aria-labelledby="search-projects-heading">
          <h2 id="search-projects-heading" className="mb-3 text-sm font-semibold text-[var(--ink)]">
            Projects
          </h2>
          {projects.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {projects.map((p) => (
                <li key={p.id}>
                  <Link href={`/profile/${p.owner_username}`} className="card card-hover block px-3 py-2.5">
                    <p className="font-medium text-[var(--ink)]">{p.title}</p>
                    {p.summary && <p className="mt-0.5 text-sm text-[var(--ink-muted)]">{p.summary}</p>}
                    <p className="mt-1 text-xs text-[var(--ink-faint)]">@{p.owner_username}</p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--ink-muted)]">No more projects for this query.</p>
          )}
          {(projectPage > 1 || hasMoreProjects) && (
            <div className="mt-3 flex items-center gap-3 text-sm">
              {projectPage > 1 && (
                <Link href={searchHref({ q, peoplePage, projectPage: projectPage - 1 })} className="text-[var(--ink-muted)] underline hover:text-[var(--ink)]">
                  Previous
                </Link>
              )}
              {hasMoreProjects && (
                <Link href={searchHref({ q, peoplePage, projectPage: projectPage + 1 })} className="text-[var(--ink-muted)] underline hover:text-[var(--ink)]">
                  Next
                </Link>
              )}
            </div>
          )}
        </section>
      )}

      {postItems.length > 0 && (
        <section className="mt-6" aria-labelledby="search-posts-heading">
          <h2 id="search-posts-heading" className="mb-3 text-sm font-semibold text-[var(--ink)]">
            Posts
          </h2>
          <div className="flex flex-col gap-3">
            <FeedTimeline items={postItems} viewerId={viewerId} />
          </div>
          {hasMorePosts && (
            <Link
              href={`/search/posts?q=${encodeURIComponent(q)}`}
              className="mt-3 block rounded-md border border-[var(--border)] py-2 text-center text-sm font-medium text-[var(--ink-muted)] transition hover:border-[var(--border-strong)] hover:text-[var(--ink)]"
            >
              Show more posts
            </Link>
          )}
        </section>
      )}
    </main>
  );
}
