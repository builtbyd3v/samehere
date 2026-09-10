import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const createProject = vi.fn();
const listOwnerProjects = vi.fn();
const parseProjectWrite = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser } }),
}));

vi.mock("@/lib/portfolio/owner", () => ({
  createProject: (...args: unknown[]) => createProject(...args),
  listOwnerProjects: (...args: unknown[]) => listOwnerProjects(...args),
  parseProjectWrite: (...args: unknown[]) => parseProjectWrite(...args),
}));

const { GET, POST } = await import("./route");

beforeEach(() => {
  getUser.mockReset();
  createProject.mockReset();
  listOwnerProjects.mockReset();
  parseProjectWrite.mockReset();
});

describe("GET/POST /api/portfolio/projects", () => {
  it("requires an authenticated owner", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await GET();
    expect(res.status).toBe(401);
    expect(createProject).not.toHaveBeenCalled();
  });

  it("creates a private draft through the owner writer", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "owner-1" } } });
    parseProjectWrite.mockReturnValue({
      ok: true,
      data: { title: "Bus", status: "draft", technologies: [], keyFeatures: [], personalRole: null, summary: null, description: null, repoUrl: null, demoUrl: null },
    });
    createProject.mockResolvedValue({
      ok: true,
      data: { id: "p1", status: "draft", title: "Bus" },
    });
    const res = await POST(
      new Request("http://localhost/api/portfolio/projects", {
        method: "POST",
        body: JSON.stringify({ title: "Bus" }),
      })
    );
    expect(res.status).toBe(201);
    expect(createProject).toHaveBeenCalled();
    expect((await res.json()).status).toBe("draft");
  });

  it("returns 503 when the hosted schema is missing", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "owner-1" } } });
    listOwnerProjects.mockResolvedValue({
      ok: false,
      unavailable: true,
      message: "Portfolio data is not available on this database yet.",
    });
    const res = await GET();
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({
      error: "Portfolio data is not available on this database yet.",
    });
  });
});
