import { describe, expect, it } from "vitest";
import type { PortfolioQueryError } from "@/lib/portfolio/errors";
import { loadPublicPortfolioBundle, type PublicReader } from "@/lib/portfolio/public";
import type { Database } from "@/types/database.types";
import type { PublicPortfolioProject, PublicPortfolioProjection } from "@/types/portfolio";
import { loadLandingExamples, toLandingExample } from "./examples";

function rpcClient(handlers: Record<string, { data?: unknown; error?: PortfolioQueryError | null }>): PublicReader {
  // Test-only: RPC table, not a real SupabaseClient.
  return {
    rpc(fn: string) {
      const hit = handlers[fn] ?? {
        error: { code: "PGRST202", message: `Could not find the function public.${fn} in the schema cache` },
      };
      return Promise.resolve({ data: hit.data ?? null, error: hit.error ?? null });
    },
  } as unknown as PublicReader;
}

type ProfileRow = Database["public"]["Functions"]["get_public_profile"]["Returns"][number];

const row: ProfileRow = {
  accent_color: "",
  avatar_url: "",
  banner_url: "",
  bio: "",
  display_name: "Ada",
  focus_areas: ["web"],
  goals: "",
  heatmap_visibility: "public",
  id: "o1",
  is_bot: false,
  is_campus_founder: false,
  is_founder: false,
  is_private: false,
  is_pro: false,
  major: "CS",
  open_to: ["feedback"],
  school: "State U",
  stage: "building",
  study_mode: null,
  headline: "Builds tools",
  github_url: null,
  linkedin_url: null,
  website_url: null,
  username: "ada",
  verified_student: false,
  year: "",
};

const projection: PublicPortfolioProjection = {
  owner_id: "o1",
  username: "ada",
  is_private: false,
  allow_indexing: false,
  publish_intro: true,
  publish_projects: true,
  publish_activity: false,
  publish_experience: false,
  publish_education: false,
  publish_posts: false,
  activity_visible: false,
  section_order: ["intro", "projects", "activity", "experience", "education", "posts"],
};

const project: PublicPortfolioProject = {
  id: "p1",
  owner_id: "o1",
  title: "Bus tracker",
  summary: null,
  description: null,
  personal_role: null,
  technologies: [],
  key_features: [],
  repo_url: null,
  demo_url: null,
  published_at: "2026-09-01T00:00:00.000Z",
  sort_order: 0,
};

function handlers(opts: { profile?: ProfileRow[]; projection?: PublicPortfolioProjection[]; projects?: PublicPortfolioProject[] } = {}) {
  return {
    get_public_profile: { data: opts.profile ?? [row] },
    get_public_portfolio: { data: opts.projection ?? [projection] },
    get_public_portfolio_projects: { data: opts.projects ?? [project] },
    get_public_portfolio_experience: { data: [] },
    get_public_portfolio_education: { data: [] },
    get_public_github_contributions: { data: [] },
  };
}

const bundle = (h: ReturnType<typeof handlers>) => loadPublicPortfolioBundle(rpcClient(h), "ada");

describe("toLandingExample", () => {
  it("maps a public account with a published project", async () => {
    const got = toLandingExample(row, await bundle(handlers()));
    expect(got?.username).toBe("ada");
    expect(got?.project.title).toBe("Bus tracker");
    expect(got?.stage).toBe("building");
    expect(got?.schoolLine).toBe("State U · CS");
  });

  it("hides private and bot accounts", async () => {
    const ok = await bundle(handlers());
    expect(toLandingExample({ ...row, is_private: true }, ok)).toBeNull();
    expect(toLandingExample({ ...row, is_bot: true }, ok)).toBeNull();
  });

  it("hides accounts without a published portfolio or project", async () => {
    expect(toLandingExample(row, await bundle(handlers({ projection: [] })))).toBeNull();
    expect(toLandingExample(row, await bundle(handlers({ projects: [] })))).toBeNull();
    const failed = await loadPublicPortfolioBundle(rpcClient({}), "ada");
    expect(failed.ok).toBe(false);
    expect(toLandingExample(row, failed)).toBeNull();
  });

  it("keeps intro fields hidden when the intro is not published", async () => {
    const got = toLandingExample(row, await bundle(handlers({ projection: [{ ...projection, publish_intro: false }] })));
    expect(got?.stage).toBeNull();
    expect(got?.focusAreas).toEqual([]);
    expect(got?.openTo).toEqual([]);
  });
});

describe("loadLandingExamples", () => {
  it("returns one example per listed account", async () => {
    expect(await loadLandingExamples(rpcClient(handlers()))).toHaveLength(2);
  });

  it("returns nothing when the profiles are missing", async () => {
    expect(await loadLandingExamples(rpcClient(handlers({ profile: [] })))).toEqual([]);
  });

  it("returns nothing when the client throws", async () => {
    const throwing = {
      rpc() {
        throw new Error("network down");
      },
    } as unknown as PublicReader;
    expect(await loadLandingExamples(throwing)).toEqual([]);
  });
});
