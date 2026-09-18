import { describe, expect, it } from "vitest";
import { PORTFOLIO_UNAVAILABLE, type PortfolioQueryError } from "./errors";
import {
  getPublicGithubContributions,
  getPublicHeatmap,
  getPublicPortfolio,
  getPublicPortfolioProjects,
  loadPublicPortfolioBundle,
} from "./public";
import type { PublicPortfolioProjection } from "@/types/portfolio";
import type { PublicReader } from "./public";

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

const projection: PublicPortfolioProjection = {
  owner_id: "o1",
  username: "ada",
  is_private: false,
  allow_indexing: false,
  publish_intro: false,
  publish_projects: true,
  publish_activity: false,
  publish_experience: false,
  publish_education: false,
  publish_posts: false,
  activity_visible: false,
  section_order: ["intro", "projects", "activity", "experience", "education", "posts"],
};

describe("getPublicPortfolio*", () => {
  it("returns typed public projection rows", async () => {
    const client = rpcClient({
      get_public_portfolio: { data: [projection] },
      get_public_portfolio_projects: {
        data: [
          {
            id: "p1",
            owner_id: "o1",
            title: "Bus",
            summary: null,
            description: null,
            personal_role: "Parser",
            technologies: [],
            key_features: [],
            repo_url: null,
            demo_url: null,
            published_at: "2026-09-01T00:00:00.000Z",
            sort_order: 0,
          },
        ],
      },
    });
    const got = await getPublicPortfolio(client, "ada");
    expect(got).toEqual({ ok: true, data: projection });
    const projects = await getPublicPortfolioProjects(client, "ada");
    expect(projects.ok).toBe(true);
    if (projects.ok) expect(projects.data[0]?.title).toBe("Bus");
  });

  it("treats blocked/missing as empty, not a crash", async () => {
    const client = rpcClient({ get_public_portfolio: { data: [] } });
    expect(await getPublicPortfolio(client, "hidden")).toEqual({ ok: true, data: null });
  });

  it("reports unavailable when the hosted DB lacks the migration", async () => {
    const client = rpcClient({});
    expect(await getPublicPortfolio(client, "ada")).toEqual({
      ok: false,
      unavailable: true,
      message: PORTFOLIO_UNAVAILABLE,
    });
    expect(await getPublicGithubContributions(client, "ada")).toMatchObject({
      ok: false,
      unavailable: true,
    });
  });

  it("does not turn a genuine RPC failure into success", async () => {
    const client = rpcClient({
      get_public_portfolio: { error: { message: "deadlock detected" } },
    });
    expect(await getPublicPortfolio(client, "ada")).toEqual({
      ok: false,
      error: "deadlock detected",
      status: 500,
    });
  });

  it("loads published Samehere days for a visible activity section", async () => {
    const client = rpcClient({
      get_public_heatmap: { data: [{ day: "2026-09-01", points: 4 }] },
    });
    const heat = await getPublicHeatmap(client, "o1");
    expect(heat).toEqual({
      ok: true,
      data: [{ day: "2026-09-01", points: 4, breakdown: {} }],
    });

    const bundleClient = rpcClient({
      get_public_portfolio: { data: [{ ...projection, activity_visible: true, publish_activity: true }] },
      get_public_portfolio_projects: { data: [] },
      get_public_portfolio_experience: { data: [] },
      get_public_portfolio_education: { data: [] },
      get_public_github_contributions: { data: [] },
      get_public_heatmap: { data: [{ day: "2026-09-01", points: 4 }] },
    });
    const bundle = await loadPublicPortfolioBundle(bundleClient, "ada");
    expect(bundle.ok).toBe(true);
    if (!bundle.ok) return;
    expect(bundle.data.samehere).toEqual([{ day: "2026-09-01", points: 4, breakdown: {} }]);
    expect(bundle.data.samehereKnown).toBe(true);
  });

  it("does not treat a failed Samehere read as a successful zero", async () => {
    const bundle = await loadPublicPortfolioBundle(
      rpcClient({
        get_public_portfolio: { data: [{ ...projection, activity_visible: true, publish_activity: true }] },
        get_public_portfolio_projects: { data: [] },
        get_public_portfolio_experience: { data: [] },
        get_public_portfolio_education: { data: [] },
        get_public_github_contributions: { data: [] },
        get_public_heatmap: { error: { message: "deadlock detected" } },
      }),
      "ada"
    );
    expect(bundle.ok).toBe(true);
    if (!bundle.ok) return;
    expect(bundle.data.samehere).toEqual([]);
    expect(bundle.data.samehereKnown).toBe(false);
  });
});
