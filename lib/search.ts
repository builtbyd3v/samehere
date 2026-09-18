import { createClient } from "@/lib/supabase/server";
import { POST_SELECT, type FeedPost } from "@/components/feed/PostCard";
import { attachSignedMedia } from "@/lib/media";
import { TEXT_LIMITS } from "@/lib/utils/validation";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

export const SEARCH_PAGE = 20;
/** PostgreSQL integer max — RPC offsets are int4. */
export const PG_INT4_MAX = 2_147_483_647;
/** Largest 1-based page whose offset still fits in int4. */
export const SEARCH_PAGE_MAX = Math.floor(PG_INT4_MAX / SEARCH_PAGE) + 1;

export type SearchPerson = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_pro: boolean;
  is_founder: boolean;
  is_campus_founder: boolean;
  verified_student: boolean;
  open_to: string[] | null;
  study_mode: string | null;
  year: string | null;
  major: string | null;
};

export type SearchProject = {
  id: string;
  owner_id: string;
  owner_username: string;
  title: string;
  summary: string | null;
  technologies: string[];
  published_at: string;
};

export type SearchRankRow = {
  exact: boolean;
  termHits: number;
  createdAt: string;
  id: string;
};

// Same sanitizer as the SQL RPCs: strips PostgREST-unsafe chars,
// then allowlists [a-z0-9] per token so nothing user-typed reaches a filter raw.
export function tokensFor(q: string): string[] {
  const safe = q.replace(/[,()*%\\]/g, "").trim().slice(0, TEXT_LIMITS.searchQuery);
  return safe
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9]/gi, ""))
    .filter(Boolean)
    .slice(0, 8);
}

export function clampSearchLimit(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return SEARCH_PAGE;
  return Math.min(SEARCH_PAGE, Math.max(1, Math.floor(v)));
}

export function clampSearchOffset(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v) || v < 0 || v > PG_INT4_MAX) return 0;
  return Math.floor(v);
}

/** 1-based page. Junk / 0 / negative / overflow → 1. */
export function parseSearchPage(raw: unknown): number {
  const v = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(v) || v < 1 || v > SEARCH_PAGE_MAX) return 1;
  return Math.floor(v);
}

export function searchPageOffset(page: number): number {
  return (parseSearchPage(page) - 1) * SEARCH_PAGE;
}

export function nextSearchOffset(offset: number): number | null {
  const next = clampSearchOffset(offset) + SEARCH_PAGE;
  if (next > PG_INT4_MAX) return null;
  return next;
}

export type SearchHrefOpts = {
  q: string;
  peoplePage?: number;
  projectPage?: number;
  tag?: string | null;
  year?: string | null;
  major?: string | null;
  mode?: string | null;
  label?: string | null;
};

export function searchHref({
  q,
  peoplePage = 1,
  projectPage = 1,
  tag,
  year,
  major,
  mode,
  label,
}: SearchHrefOpts): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (tag) params.set("tag", tag);
  if (year) params.set("year", year);
  if (major) params.set("major", major);
  if (mode) params.set("mode", mode);
  if (label) params.set("label", label);
  const people = parseSearchPage(peoplePage);
  const project = parseSearchPage(projectPage);
  if (people > 1) params.set("peoplePage", String(people));
  if (project > 1) params.set("projectPage", String(project));
  const qs = params.toString();
  return qs ? `/search?${qs}` : "/search";
}

export function projectSearchHref(q: string, projectPage: number, peoplePage = 1): string {
  return searchHref({ q, projectPage, peoplePage });
}

export function postsSearchHref(q: string, offset: number, label?: string | null): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (label) params.set("label", label);
  const off = clampSearchOffset(offset);
  if (off > 0) params.set("offset", String(off));
  const qs = params.toString();
  return qs ? `/search/posts?${qs}` : "/search/posts";
}

/** exact-name/title > matched terms > recency+id. Visibility must already be applied. */
export function compareSearchRank(a: SearchRankRow, b: SearchRankRow): number {
  if (a.exact !== b.exact) return a.exact ? -1 : 1;
  if (a.termHits !== b.termHits) return b.termHits - a.termHits;
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
  if (a.id !== b.id) return a.id < b.id ? 1 : -1;
  return 0;
}

export function paginateRanked<T extends SearchRankRow>(
  visible: T[],
  limit: number,
  offset: number,
): T[] {
  return [...visible].sort(compareSearchRank).slice(clampSearchOffset(offset), clampSearchOffset(offset) + clampSearchLimit(limit));
}

export type SearchPeopleOpts = {
  openTo?: string | null;
  year?: string | null;
  major?: string | null;
  studyMode?: string | null;
};

export async function searchPeople(
  supabase: SupabaseServer,
  query: string,
  limit = SEARCH_PAGE,
  offset = 0,
  opts: SearchPeopleOpts = {},
): Promise<SearchPerson[]> {
  const hasQuery = tokensFor(query).length > 0;
  const hasFilters = Boolean(opts.openTo || opts.year || opts.major || opts.studyMode);
  if (!hasQuery && !hasFilters) return [];
  const { data, error } = await supabase.rpc("search_people", {
    p_query: query,
    p_limit: clampSearchLimit(limit),
    p_offset: clampSearchOffset(offset),
    p_open_to: opts.openTo ?? undefined,
    p_year: opts.year ?? undefined,
    p_major: opts.major ?? undefined,
    p_study_mode: opts.studyMode ?? undefined,
  });
  if (error || !data) return [];
  return data;
}

export async function searchProjects(
  supabase: SupabaseServer,
  query: string,
  limit = SEARCH_PAGE,
  offset = 0,
): Promise<SearchProject[]> {
  if (!tokensFor(query).length) return [];
  const { data, error } = await supabase.rpc("search_projects", {
    p_query: query,
    p_limit: clampSearchLimit(limit),
    p_offset: clampSearchOffset(offset),
  });
  if (error || !data) return [];
  return data;
}

export async function searchPosts(
  supabase: SupabaseServer,
  query: string,
  limit = SEARCH_PAGE,
  offset = 0,
  label?: string | null,
): Promise<FeedPost[]> {
  if (!tokensFor(query).length && !label) return [];
  const { data: ranked, error } = await supabase.rpc("search_posts", {
    p_query: query,
    p_limit: clampSearchLimit(limit),
    p_offset: clampSearchOffset(offset),
    p_label: label ?? undefined,
  });
  if (error || !ranked?.length) return [];
  const ids = ranked.map((r) => r.id);
  const { data } = await supabase.from("posts").select(POST_SELECT).in("id", ids).returns<FeedPost[]>();
  const byId = new Map((data ?? []).map((p) => [p.id, p]));
  const ordered = ids.map((id) => byId.get(id)).filter((p): p is FeedPost => !!p);
  return ordered.length ? attachSignedMedia(supabase, ordered) : [];
}
