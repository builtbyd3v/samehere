import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FeedSearchResults } from "@/components/feed/FeedSearch";
import FeedTimeline from "@/components/feed/FeedTimeline";
import EmptyState from "@/components/ui/EmptyState";
import SearchBar from "@/components/search/SearchBar";
import SearchFilters from "@/components/search/SearchFilters";
import SearchIdlePeople from "@/components/search/SearchIdlePeople";
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
import { hasDiscoveryFilters, hasPeopleFilters, parseDiscoveryFilters, postsDiscoveryHref } from "@/lib/discovery";

const POSTS_PREVIEW = 3;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    peoplePage?: string;
    projectPage?: string;
    tag?: string;
    year?: string;
    major?: string;
    mode?: string;
    label?: string;
  }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const filters = parseDiscoveryFilters(params);
  const peoplePage = parseSearchPage(params.peoplePage);
  const peopleOffset = searchPageOffset(peoplePage);
  const projectPage = parseSearchPage(params.projectPage);
  const projectOffset = searchPageOffset(projectPage);
  const hasQuery = Boolean(q && tokensFor(q).length);
  const browsing = !hasQuery && hasDiscoveryFilters(filters);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const viewerId = user?.id ?? null;
  const { data: viewer } = user
    ? await supabase.from("profiles").select("major").eq("id", user.id).maybeSingle()
    : { data: null };

  const keep = {
    tag: filters.tag,
    year: filters.year,
    major: filters.major,
    mode: filters.mode,
    label: filters.label,
  };

  if (!hasQuery && !browsing) {
    return (
      <main className="page-enter mx-auto max-w-2xl px-4 py-8">
        <SearchBar keep={keep} />
        <SearchFilters q="" filters={filters} viewerMajor={viewer?.major} />
        <EmptyState
          title="Search people, projects, and posts"
          description="Type a name, username, or major — or follow someone below to start your feed."
        />
        <SearchIdlePeople />
      </main>
    );
  }

  const [posts, projects] = await Promise.all([
    hasQuery || filters.label ? searchPosts(supabase, q, POSTS_PREVIEW + 1, 0, filters.label) : Promise.resolve([]),
    hasQuery ? searchProjects(supabase, q, SEARCH_PAGE, projectOffset) : Promise.resolve([]),
  ]);

  const hasMorePosts = posts.length > POSTS_PREVIEW;
  const hasMoreProjects = projects.length === SEARCH_PAGE && nextSearchOffset(projectOffset) != null;
  const postItems = posts
    .slice(0, POSTS_PREVIEW)
    .map((post) => ({ kind: "post" as const, created_at: post.created_at, post }));
  const showProjects = hasQuery && (projects.length > 0 || projectPage > 1);
  const showPeople = hasQuery || hasPeopleFilters(filters);

  return (
    <main className="page-enter mx-auto max-w-2xl px-4 py-8">
      <SearchBar initialQuery={q} keep={keep} />
      <SearchFilters q={q} filters={filters} viewerMajor={viewer?.major} />

      {showPeople && (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-[var(--ink)]">
            {browsing && hasPeopleFilters(filters) ? "Browse people at your stage" : "People"}
          </h2>
          <FeedSearchResults q={q} page={peoplePage} offset={peopleOffset} projectPage={projectPage} filters={filters} />
        </section>
      )}

      {showProjects && (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-[var(--ink)]">Projects</h2>
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
                <Link href={searchHref({ q, peoplePage, projectPage: projectPage - 1, ...keep })} className="text-[var(--ink-muted)] underline hover:text-[var(--ink)]">
                  Previous
                </Link>
              )}
              {hasMoreProjects && (
                <Link href={searchHref({ q, peoplePage, projectPage: projectPage + 1, ...keep })} className="text-[var(--ink-muted)] underline hover:text-[var(--ink)]">
                  Next
                </Link>
              )}
            </div>
          )}
        </section>
      )}

      {postItems.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-[var(--ink)]">Posts</h2>
          <div className="flex flex-col gap-3">
            <FeedTimeline items={postItems} viewerId={viewerId} />
          </div>
          {hasMorePosts && (
            <Link
              href={postsDiscoveryHref(q, filters)}
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
