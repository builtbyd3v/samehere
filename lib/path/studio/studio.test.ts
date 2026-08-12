import { describe, expect, it } from "vitest";
import { getProjectBySlug } from "@/lib/path/seeds/projects";
import { getStudioManifest } from "@/lib/path/studio/get-studio-manifest";
import { URL_SHORTENER_STUDIO_MANIFEST } from "@/lib/path/studio/manifests/url-shortener";
import {
  isSafeStudioPath,
  validateMilestoneChecklistLinkage,
  validateStudioManifest,
} from "@/lib/path/studio/validate";
import { resolveTechIconSrc } from "@/components/tech/tech-icons";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function baseManifest() {
  return {
    version: 1,
    runtime: "remote_node" as const,
    language: "TypeScript",
    technologies: ["TypeScript", "Next.js"],
    entryFile: "app/page.tsx",
    visibleFiles: ["app/page.tsx", "README.md"],
    starterFiles: [
      { path: "app/page.tsx", code: "export default function Page() { return null }" },
      { path: "README.md", code: "# Demo" },
    ],
    milestones: [
      {
        id: "m1",
        checklistId: "schema",
        title: "Schema",
        acceptance: ["Table exists"],
      },
    ],
    commands: { preview: "npm run dev" },
  };
}

describe("isSafeStudioPath", () => {
  it("accepts relative nested paths", () => {
    expect(isSafeStudioPath("app/page.tsx")).toBe(true);
    expect(isSafeStudioPath("app/r/[code]/route.ts")).toBe(true);
  });

  it("rejects traversal, absolute, and empty paths", () => {
    expect(isSafeStudioPath("")).toBe(false);
    expect(isSafeStudioPath(" app/page.tsx")).toBe(false);
    expect(isSafeStudioPath("/app/page.tsx")).toBe(false);
    expect(isSafeStudioPath("../secrets")).toBe(false);
    expect(isSafeStudioPath("app/../page.tsx")).toBe(false);
    expect(isSafeStudioPath("app\\page.tsx")).toBe(false);
    expect(isSafeStudioPath("C:/app/page.tsx")).toBe(false);
  });
});

describe("validateStudioManifest", () => {
  it("accepts a well-formed manifest", () => {
    const result = validateStudioManifest(baseManifest());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.manifest.entryFile).toBe("app/page.tsx");
    expect(result.manifest.runtime).toBe("remote_node");
  });

  it("rejects non-objects and missing required fields", () => {
    expect(validateStudioManifest(null).ok).toBe(false);
    expect(validateStudioManifest("nope").ok).toBe(false);

    const missingVersion = { ...baseManifest(), version: undefined };
    const result = validateStudioManifest(missingVersion);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.includes("version"))).toBe(true);
  });

  it("rejects invalid runtime and empty technologies", () => {
    const badRuntime = validateStudioManifest({ ...baseManifest(), runtime: "sandpack" });
    expect(badRuntime.ok).toBe(false);

    const badTech = validateStudioManifest({ ...baseManifest(), technologies: [] });
    expect(badTech.ok).toBe(false);
  });

  it("rejects duplicate and invalid starter paths", () => {
    const duplicate = validateStudioManifest({
      ...baseManifest(),
      starterFiles: [
        { path: "app/page.tsx", code: "a" },
        { path: "app/page.tsx", code: "b" },
        { path: "README.md", code: "#" },
      ],
    });
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) {
      expect(duplicate.errors.some((e) => e.includes("duplicate"))).toBe(true);
    }

    const unsafe = validateStudioManifest({
      ...baseManifest(),
      starterFiles: [
        { path: "../etc/passwd", code: "x" },
        { path: "README.md", code: "#" },
      ],
      visibleFiles: ["README.md"],
      entryFile: "README.md",
    });
    expect(unsafe.ok).toBe(false);
    if (!unsafe.ok) {
      expect(unsafe.errors.some((e) => e.toLowerCase().includes("unsafe"))).toBe(true);
    }
  });

  it("rejects duplicate visibleFiles paths", () => {
    const result = validateStudioManifest({
      ...baseManifest(),
      visibleFiles: ["app/page.tsx", "app/page.tsx", "README.md"],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("visibleFiles") && e.includes("duplicate"))).toBe(
        true,
      );
    }
  });

  it("requires entryFile in visibleFiles and starterFiles", () => {
    const missingVisible = validateStudioManifest({
      ...baseManifest(),
      visibleFiles: ["README.md"],
    });
    expect(missingVisible.ok).toBe(false);
    if (!missingVisible.ok) {
      expect(missingVisible.errors.some((e) => e.includes("visibleFiles"))).toBe(true);
    }

    const missingStarter = validateStudioManifest({
      ...baseManifest(),
      starterFiles: [{ path: "README.md", code: "#" }],
      visibleFiles: ["app/page.tsx", "README.md"],
      entryFile: "app/page.tsx",
    });
    expect(missingStarter.ok).toBe(false);
    if (!missingStarter.ok) {
      expect(
        missingStarter.errors.some(
          (e) => e.includes("entryFile") || e.includes("missing from starterFiles"),
        ),
      ).toBe(true);
    }
  });

  it("requires every visibleFiles path to exist in starterFiles", () => {
    const result = validateStudioManifest({
      ...baseManifest(),
      visibleFiles: ["app/page.tsx", "README.md", "missing.ts"],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("missing.ts"))).toBe(true);
    }
  });

  it("rejects duplicate milestone checklist ids", () => {
    const result = validateStudioManifest({
      ...baseManifest(),
      milestones: [
        {
          id: "m1",
          checklistId: "schema",
          title: "One",
          acceptance: ["a"],
        },
        {
          id: "m2",
          checklistId: "schema",
          title: "Two",
          acceptance: ["b"],
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("checklistId"))).toBe(true);
    }
  });
});

describe("validateMilestoneChecklistLinkage", () => {
  it("passes when checklist ids match the project", () => {
    const validated = validateStudioManifest(URL_SHORTENER_STUDIO_MANIFEST);
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;

    const project = getProjectBySlug("url-shortener");
    expect(project).toBeDefined();
    const ids = project!.build_checklist.map((item) => item.id);
    const linked = validateMilestoneChecklistLinkage(validated.manifest, ids);
    expect(linked.ok).toBe(true);
  });

  it("fails when a milestone points at an unknown checklist id", () => {
    const validated = validateStudioManifest(baseManifest());
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;

    const linked = validateMilestoneChecklistLinkage(validated.manifest, ["shorten"]);
    expect(linked.ok).toBe(false);
    if (!linked.ok) {
      expect(linked.errors[0]).toMatch(/schema/);
    }
  });
});

describe("getStudioManifest", () => {
  it("returns null for unknown projects", () => {
    expect(getStudioManifest("does-not-exist")).toBeNull();
    expect(getStudioManifest("")).toBeNull();
  });

  it("returns the versioned URL Shortener remote_node manifest", () => {
    const manifest = getStudioManifest("url-shortener");
    expect(manifest).not.toBeNull();
    if (!manifest) return;

    expect(manifest.version).toBe(1);
    expect(manifest.runtime).toBe("remote_node");
    expect(manifest.language).toBe("TypeScript");
    expect(manifest.technologies).toEqual(
      expect.arrayContaining(["TypeScript", "Next.js", "PostgreSQL", "Node.js", "Git"]),
    );
    expect(manifest.entryFile).toBe("app/page.tsx");
    expect(manifest.visibleFiles).toContain("app/api/shorten/route.ts");
    expect(manifest.starterFiles.some((f) => f.path === "sql/schema.sql")).toBe(true);
    expect(manifest.starterFiles.every((f) => typeof f.code === "string")).toBe(true);

    const project = getProjectBySlug("url-shortener");
    expect(project).toBeDefined();
    const checklistIds = new Set(project!.build_checklist.map((item) => item.id));
    for (const milestone of manifest.milestones) {
      expect(checklistIds.has(milestone.checklistId)).toBe(true);
    }

    // Scaffolding, not a completed solution.
    const shorten = manifest.starterFiles.find((f) => f.path === "app/api/shorten/route.ts");
    expect(shorten?.code).toMatch(/TODO/);
    expect(shorten?.code).not.toMatch(/INSERT INTO/i);
  });
});

describe("TechIcon asset mapping", () => {
  it("maps known labels to vendored Devicon paths", () => {
    expect(resolveTechIconSrc("TypeScript")).toBe("/tech-icons/typescript.svg");
    expect(resolveTechIconSrc("Next.js")).toBe("/tech-icons/nextjs.svg");
    expect(resolveTechIconSrc("PostgreSQL")).toBe("/tech-icons/postgresql.svg");
    expect(resolveTechIconSrc("Postgres")).toBe("/tech-icons/postgresql.svg");
    expect(resolveTechIconSrc("Node.js")).toBe("/tech-icons/nodejs.svg");
    expect(resolveTechIconSrc("Git")).toBe("/tech-icons/git.svg");
  });

  it("returns null for concept labels without official marks", () => {
    expect(resolveTechIconSrc("REST")).toBeNull();
    expect(resolveTechIconSrc("Auth")).toBeNull();
  });

  it("keeps LICENSE and SVG assets on disk", () => {
    // tests live at lib/path/studio/*.test.ts → workspace root is ../../..
    const workspaceRoot = resolve(import.meta.dirname, "../../..");
    const icons = ["typescript", "nextjs", "postgresql", "nodejs", "git"];
    for (const name of icons) {
      const path = resolve(workspaceRoot, `public/tech-icons/${name}.svg`);
      expect(existsSync(path)).toBe(true);
      expect(readFileSync(path, "utf8")).toContain("<svg");
    }
    expect(existsSync(resolve(workspaceRoot, "public/tech-icons/LICENSE"))).toBe(true);
    expect(existsSync(resolve(workspaceRoot, "public/tech-icons/ATTRIBUTION.md"))).toBe(true);
  });
});
