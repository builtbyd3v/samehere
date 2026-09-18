import { describe, expect, it } from "vitest";
import { PORTFOLIO_UNAVAILABLE, type PortfolioQueryError } from "./errors";
import {
  createProject,
  parseProjectWrite,
  reorderProjects,
  saveOwnerSettings,
  setProjectStatus,
  updateProjectFields,
} from "./owner";
import type { ProjectWriteInput } from "@/types/portfolio";
import type { OwnerClient } from "./owner";

type Row = Record<string, unknown>;
type QueryResult = { data: unknown; error: PortfolioQueryError | null };
type Payload = Row | Row[];

function memoryClient(init?: {
  projects?: Row[];
  settings?: Row[];
  fail?: { table: string; error: PortfolioQueryError };
  settingsSelectMisses?: number;
}): OwnerClient {
  const projects = [...(init?.projects ?? [])];
  const settings = [...(init?.settings ?? [])];
  const fail = init?.fail;
  let settingsSelectMisses = init?.settingsSelectMisses ?? 0;

  function table(name: string) {
    const rows = name === "portfolio_settings" ? settings : projects;
    let mode: "select" | "insert" | "update" | "delete" | "upsert" = "select";
    let payload: Payload = {};
    const filters: Array<[string, unknown]> = [];

    const run = () => {
      if (fail && fail.table === name) return { data: null, error: fail.error };
      const match = () => rows.filter((row) => filters.every(([key, value]) => row[key] === value));
      if (mode === "select") {
        if (name === "portfolio_settings" && settingsSelectMisses > 0) {
          settingsSelectMisses -= 1;
          return { data: [], error: null };
        }
        const found = match().sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));
        return { data: found, error: null };
      }
      if (mode === "insert") {
        const inserted = Array.isArray(payload) ? payload[0] ?? {} : payload;
        if (name === "portfolio_settings" && rows.some((row) => row.owner_id === inserted.owner_id)) {
          return { data: null, error: { code: "23505", message: "duplicate key value violates unique constraint" } };
        }
        const row = {
          id: (inserted.id as string) ?? `p${rows.length + 1}`,
          published_at: null,
          source_repository_id: null,
          source_commit_sha: null,
          source_analysis_id: null,
          created_at: "2026-09-10T00:00:00.000Z",
          updated_at: "2026-09-10T00:00:00.000Z",
          version: 1,
          ...inserted,
        };
        rows.push(row);
        return { data: row, error: null };
      }
      if (mode === "upsert") {
        const items = Array.isArray(payload) ? payload : [payload];
        const first = items[0] ?? {};
        const order = first.section_order;
        if (
          !Array.isArray(payload) &&
          Array.isArray(order) &&
          order.join(",") !== "intro,projects,activity,experience,education,posts"
        ) {
          return { data: null, error: { message: "section order requires pro" } };
        }
        const updated: Row[] = [];
        for (const item of items) {
          const index = item.id
            ? rows.findIndex((row) => row.id === item.id)
            : rows.findIndex((row) => row.owner_id === item.owner_id);
          const row = {
            version: 1,
            updated_at: "2026-09-10T00:00:00.000Z",
            ...item,
          };
          if (index >= 0) {
            rows[index] = { ...rows[index], ...row, version: Number(rows[index].version ?? 0) + 1 };
            updated.push(rows[index]);
          } else {
            rows.push(row);
            updated.push(row);
          }
        }
        return { data: updated.length === 1 ? updated[0] : updated, error: null };
      }
      if (mode === "update") {
        const found = match();
        if (found.length === 0) return { data: null, error: null };
        Object.assign(found[0], payload, { updated_at: "2026-09-10T00:00:01.000Z" });
        if (payload.status === "published" && !found[0].published_at) {
          found[0].published_at = "2026-09-10T00:00:01.000Z";
        }
        if (payload.status === "draft") found[0].published_at = null;
        return { data: found[0], error: null };
      }
      if (mode === "delete") {
        const keep = rows.filter((row) => !filters.every(([key, value]) => row[key] === value));
        rows.length = 0;
        rows.push(...keep);
        return { data: null, error: null };
      }
      return { data: null, error: { message: "unknown" } };
    };

    const api = {
      select() {
        return api;
      },
      insert(values: Row) {
        mode = "insert";
        payload = values;
        return api;
      },
      update(values: Row) {
        mode = "update";
        payload = values;
        return api;
      },
      upsert(values: Payload) {
        mode = "upsert";
        payload = values;
        return api;
      },
      delete() {
        mode = "delete";
        return api;
      },
      eq(column: string, value: unknown) {
        filters.push([column, value]);
        return api;
      },
      in() {
        return api;
      },
      order() {
        return api;
      },
      maybeSingle() {
        const result = run();
        const data = Array.isArray(result.data) ? (result.data[0] ?? null) : result.data;
        return Promise.resolve({ data, error: result.error });
      },
      returns() {
        return api;
      },
      then(resolve: (value: QueryResult) => unknown) {
        return Promise.resolve(resolve(run()));
      },
    };
    return api;
  }

  // Test-only: in-memory `from` chain, not a real SupabaseClient.
  return { from: table } as unknown as OwnerClient;
}

const draftWrite: ProjectWriteInput = {
  title: "Campus bus",
  summary: "ETAs",
  description: "GTFS",
  personalRole: null,
  technologies: ["Go"],
  keyFeatures: ["Map"],
  repoUrl: "https://github.com/acme/bus",
  demoUrl: null,
  status: "draft",
};

describe("parseProjectWrite", () => {
  it("rejects invalid URLs and strips analysis source fields", () => {
    expect(parseProjectWrite({ ...draftWrite, repoUrl: "javascript:alert(1)" }).ok).toBe(false);
    const parsed = parseProjectWrite({
      ...draftWrite,
      source_analysis_id: "should-not-apply",
      source_repository_id: 99,
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.data).not.toHaveProperty("source_analysis_id");
  });
});

describe("create / update / publish", () => {
  it("creates a private draft and refuses publish without role confirmation", async () => {
    const client = memoryClient();
    const created = await createProject(client, "owner-1", { ...draftWrite, status: "published", personalRole: "Built it" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.data.status).toBe("draft");
    expect(created.data.source_analysis_id).toBeNull();

    const denied = await setProjectStatus(client, "owner-1", created.data.id, "published", false);
    expect(denied).toMatchObject({ ok: false, error: "Confirm your personal role before publishing.", status: 400 });

    const noRole = await setProjectStatus(
      memoryClient({
        projects: [{ ...created.data, personal_role: null, owner_id: "owner-1", status: "draft" }],
      }),
      "owner-1",
      created.data.id,
      "published",
      true
    );
    expect(noRole).toMatchObject({ ok: false, status: 400 });

    const withRole = await updateProjectFields(client, "owner-1", created.data.id, {
      ...draftWrite,
      personalRole: "Wrote the parser.",
    });
    expect(withRole.ok).toBe(true);
    const published = await setProjectStatus(client, "owner-1", created.data.id, "published", true);
    expect(published.ok).toBe(true);
    if (published.ok) expect(published.data.status).toBe("published");
  });

  it("field updates do not change publication status", async () => {
    const client = memoryClient({
      projects: [
        {
          id: "p1",
          owner_id: "owner-1",
          title: "Old",
          summary: null,
          description: null,
          personal_role: "Role",
          technologies: [],
          key_features: [],
          repo_url: null,
          demo_url: null,
          status: "published",
          sort_order: 0,
          published_at: "2026-09-01T00:00:00.000Z",
          source_repository_id: 7,
          source_commit_sha: "abc",
          source_analysis_id: "an1",
          created_at: "2026-09-01T00:00:00.000Z",
          updated_at: "2026-09-01T00:00:00.000Z",
        },
      ],
    });
    const updated = await updateProjectFields(client, "owner-1", "p1", {
      ...draftWrite,
      title: "New title",
      personalRole: "Role",
      status: "draft",
    });
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    expect(updated.data.status).toBe("published");
    expect(updated.data.source_analysis_id).toBe("an1");
    expect(updated.data.title).toBe("New title");
  });
});

describe("reorder + settings", () => {
  it("reorders only the owner's complete id set", async () => {
    const client = memoryClient({
      projects: [
        { id: "a", owner_id: "o", title: "A", summary: null, description: null, personal_role: null, technologies: [], key_features: [], repo_url: null, demo_url: null, status: "draft", sort_order: 0, published_at: null, source_repository_id: null, source_commit_sha: null, source_analysis_id: null, created_at: "", updated_at: "" },
        { id: "b", owner_id: "o", title: "B", summary: null, description: null, personal_role: null, technologies: [], key_features: [], repo_url: null, demo_url: null, status: "draft", sort_order: 1, published_at: null, source_repository_id: null, source_commit_sha: null, source_analysis_id: null, created_at: "", updated_at: "" },
      ],
    });
    expect((await reorderProjects(client, "o", ["b"])).ok).toBe(false);
    const ok = await reorderProjects(client, "o", ["b", "a"]);
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.data.map((p) => p.id)).toEqual(["b", "a"]);
  });

  it("defaults unpublished settings and ignores Free section_order writes", async () => {
    const client = memoryClient();
    const saved = await saveOwnerSettings(
      client,
      "o",
      {
        publish_intro: true,
        publish_projects: false,
        publish_activity: false,
        publish_experience: false,
        publish_education: false,
        publish_posts: false,
        allow_indexing: false,
      },
      ["posts", "intro", "projects", "activity", "experience", "education"],
      { isPrivate: false, isPro: false }
    );
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.data.publish_intro).toBe(true);
    expect(saved.data.section_order[0]).toBe("intro");
  });

  it("lets an expired owner change flags without rewriting a saved custom order", async () => {
    const customOrder = ["projects", "intro", "activity", "experience", "education", "posts"];
    const client = memoryClient({
      settings: [
        {
          owner_id: "o",
          publish_intro: false,
          publish_projects: true,
          publish_activity: false,
          publish_experience: false,
          publish_education: false,
          publish_posts: false,
          allow_indexing: false,
          section_order: customOrder,
          updated_at: "2026-09-01T00:00:00.000Z",
          version: 2,
        },
      ],
    });
    const saved = await saveOwnerSettings(
      client,
      "o",
      {
        publish_intro: true,
        publish_projects: true,
        publish_activity: false,
        publish_experience: false,
        publish_education: false,
        publish_posts: false,
        allow_indexing: true,
      },
      ["posts", "intro", "projects", "activity", "experience", "education"],
      { isPrivate: false, isPro: false }
    );
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.data.publish_intro).toBe(true);
    expect(saved.data.allow_indexing).toBe(true);
    expect(saved.data.section_order).toEqual(customOrder);
  });

  it("updates when a concurrent first insert wins", async () => {
    const customOrder = ["projects", "intro", "activity", "experience", "education", "posts"];
    const client = memoryClient({
      settings: [
        {
          owner_id: "o",
          publish_intro: false,
          publish_projects: false,
          publish_activity: false,
          publish_experience: false,
          publish_education: false,
          publish_posts: false,
          allow_indexing: false,
          section_order: customOrder,
          updated_at: "2026-09-01T00:00:00.000Z",
          version: 1,
        },
      ],
      settingsSelectMisses: 1,
    });
    const saved = await saveOwnerSettings(
      client,
      "o",
      {
        publish_intro: true,
        publish_projects: false,
        publish_activity: false,
        publish_experience: false,
        publish_education: false,
        publish_posts: false,
        allow_indexing: false,
      },
      ["posts", "intro", "projects", "activity", "experience", "education"],
      { isPrivate: false, isPro: false }
    );
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.data.publish_intro).toBe(true);
    expect(saved.data.section_order).toEqual(customOrder);
  });
});

describe("missing migration", () => {
  it("reports unavailable instead of a successful write", async () => {
    const client = memoryClient({
      fail: {
        table: "portfolio_projects",
        error: { code: "PGRST205", message: "Could not find the table 'public.portfolio_projects' in the schema cache" },
      },
    });
    const result = await createProject(client, "o", draftWrite);
    expect(result).toEqual({ ok: false, unavailable: true, message: PORTFOLIO_UNAVAILABLE });
  });
});
