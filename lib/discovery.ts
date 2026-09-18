import { CONTEXT_LABELS, OPEN_TO_TAGS, STUDY_MODES } from "@/lib/portfolio/validation";
import { YEAR_VALUES } from "@/lib/education-options";
import { TEXT_LIMITS } from "@/lib/utils/validation";

function pageOrOne(n: number): number {
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

export type DiscoveryFilters = {
  tag: (typeof OPEN_TO_TAGS)[number] | null;
  year: (typeof YEAR_VALUES)[number] | null;
  major: string | null;
  mode: (typeof STUDY_MODES)[number] | null;
  label: (typeof CONTEXT_LABELS)[number] | null;
};

const TAGS = new Set<string>(OPEN_TO_TAGS);
const YEARS = new Set<string>(YEAR_VALUES);
const MODES = new Set<string>(STUDY_MODES);
const LABELS = new Set<string>(CONTEXT_LABELS);

function oneOf<T extends string>(raw: string | undefined, allowed: Set<string>): T | null {
  const v = (raw ?? "").trim();
  if (!v || !allowed.has(v)) return null;
  return v as T;
}

export function parseMajorFilter(raw: string | undefined): string | null {
  const v = (raw ?? "").trim().slice(0, 80);
  if (!v) return null;
  const safe = v.replace(/[,()*%\\]/g, "").trim();
  return safe.length ? safe : null;
}

export function parseDiscoveryFilters(params: {
  tag?: string;
  year?: string;
  major?: string;
  mode?: string;
  label?: string;
}): DiscoveryFilters {
  return {
    tag: oneOf(params.tag, TAGS),
    year: oneOf(params.year, YEARS),
    major: parseMajorFilter(params.major),
    mode: oneOf(params.mode, MODES),
    label: oneOf(params.label, LABELS),
  };
}

export function hasDiscoveryFilters(filters: DiscoveryFilters): boolean {
  return Boolean(filters.tag || filters.year || filters.major || filters.mode || filters.label);
}

export function hasPeopleFilters(filters: DiscoveryFilters): boolean {
  return Boolean(filters.tag || filters.year || filters.major || filters.mode);
}

export type DiscoveryHrefOpts = {
  q?: string;
  filters?: Partial<DiscoveryFilters>;
  peoplePage?: number;
  projectPage?: number;
};

export function discoveryHref({ q = "", filters, peoplePage = 1, projectPage = 1 }: DiscoveryHrefOpts): string {
  const params = new URLSearchParams();
  const query = q.trim().slice(0, TEXT_LIMITS.searchQuery);
  if (query) params.set("q", query);
  if (filters?.tag) params.set("tag", filters.tag);
  if (filters?.year) params.set("year", filters.year);
  if (filters?.major) params.set("major", filters.major);
  if (filters?.mode) params.set("mode", filters.mode);
  if (filters?.label) params.set("label", filters.label);
  const people = pageOrOne(peoplePage);
  const project = pageOrOne(projectPage);
  if (people > 1) params.set("peoplePage", String(people));
  if (project > 1) params.set("projectPage", String(project));
  const qs = params.toString();
  return qs ? `/search?${qs}` : "/search";
}

export function toggleFilter<K extends keyof DiscoveryFilters>(
  current: DiscoveryFilters,
  key: K,
  value: NonNullable<DiscoveryFilters[K]>,
  q = "",
): string {
  const next: DiscoveryFilters = { ...current, [key]: current[key] === value ? null : value };
  return discoveryHref({ q, filters: next });
}

export function postsDiscoveryHref(q: string, filters: DiscoveryFilters, offset = 0): string {
  const params = new URLSearchParams();
  const query = q.trim().slice(0, TEXT_LIMITS.searchQuery);
  if (query) params.set("q", query);
  if (filters.label) params.set("label", filters.label);
  if (offset > 0) params.set("offset", String(offset));
  const qs = params.toString();
  return qs ? `/search/posts?${qs}` : "/search/posts";
}
