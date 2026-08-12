import { describe, expect, it } from "vitest";
import type { StudioStarterFile } from "@/lib/path/types";
import {
  MAX_WORKSPACE_FILE_CONTENT_CHARS,
  buildSeededWorkspaceFiles,
  findWritableStarterFile,
  isCreateWorkspaceRevision,
  parseSaveProjectWorkspaceFileInput,
  shapeSaveConflict,
  shapeSaveError,
  shapeSaveSuccess,
  toProjectWorkspaceSnapshot,
} from "@/lib/path/studio/workspace";

const starters: StudioStarterFile[] = [
  { path: "README.md", code: "# Readme", readOnly: true },
  { path: "app/page.tsx", code: "export default function Page() { return null }" },
  { path: "lib/links.ts", code: "export {}" },
];

function validSaveInput(overrides: Record<string, unknown> = {}) {
  return {
    projectSlug: "url-shortener",
    templateVersion: 1,
    path: "app/page.tsx",
    content: "export default function Page() { return <main /> }",
    expectedWorkspaceRevision: 0,
    expectedFileRevision: 0,
    ...overrides,
  };
}

describe("parseSaveProjectWorkspaceFileInput", () => {
  it("accepts a well-formed payload", () => {
    const result = parseSaveProjectWorkspaceFileInput(validSaveInput());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.path).toBe("app/page.tsx");
    expect(result.value.expectedWorkspaceRevision).toBe(0);
  });

  it("rejects non-objects and blank slugs", () => {
    expect(parseSaveProjectWorkspaceFileInput(null).ok).toBe(false);
    expect(parseSaveProjectWorkspaceFileInput("nope").ok).toBe(false);
    expect(parseSaveProjectWorkspaceFileInput(validSaveInput({ projectSlug: "" })).ok).toBe(
      false,
    );
    expect(
      parseSaveProjectWorkspaceFileInput(validSaveInput({ projectSlug: " url-shortener" })).ok,
    ).toBe(false);
  });

  it("rejects unsafe paths and oversize content", () => {
    const unsafe = parseSaveProjectWorkspaceFileInput(
      validSaveInput({ path: "../secrets.ts" }),
    );
    expect(unsafe.ok).toBe(false);

    const absolute = parseSaveProjectWorkspaceFileInput(
      validSaveInput({ path: "/app/page.tsx" }),
    );
    expect(absolute.ok).toBe(false);

    const tooLarge = parseSaveProjectWorkspaceFileInput(
      validSaveInput({ content: "x".repeat(MAX_WORKSPACE_FILE_CONTENT_CHARS + 1) }),
    );
    expect(tooLarge.ok).toBe(false);
    if (tooLarge.ok) return;
    expect(tooLarge.error).toMatch(/too large/i);
  });

  it("rejects invalid template and revision values", () => {
    expect(
      parseSaveProjectWorkspaceFileInput(validSaveInput({ templateVersion: 0 })).ok,
    ).toBe(false);
    expect(
      parseSaveProjectWorkspaceFileInput(validSaveInput({ templateVersion: 1.5 })).ok,
    ).toBe(false);
    expect(
      parseSaveProjectWorkspaceFileInput(
        validSaveInput({ expectedWorkspaceRevision: -1 }),
      ).ok,
    ).toBe(false);
    expect(
      parseSaveProjectWorkspaceFileInput(validSaveInput({ expectedFileRevision: 1.2 })).ok,
    ).toBe(false);
  });

  it("accepts content at the exact size limit", () => {
    const result = parseSaveProjectWorkspaceFileInput(
      validSaveInput({ content: "a".repeat(MAX_WORKSPACE_FILE_CONTENT_CHARS) }),
    );
    expect(result.ok).toBe(true);
  });
});

describe("findWritableStarterFile", () => {
  it("returns editable starters and rejects read-only or unknown paths", () => {
    expect(findWritableStarterFile(starters, "app/page.tsx")?.path).toBe("app/page.tsx");
    expect(findWritableStarterFile(starters, "README.md")).toBeNull();
    expect(findWritableStarterFile(starters, "missing.ts")).toBeNull();
  });
});

describe("buildSeededWorkspaceFiles", () => {
  it("overlays the edited path at revision 1 and seeds siblings at 0", () => {
    const seeded = buildSeededWorkspaceFiles({
      starterFiles: starters,
      path: "app/page.tsx",
      content: "updated",
    });

    expect(seeded).toEqual([
      { path: "README.md", content: "# Readme", revision: 0 },
      { path: "app/page.tsx", content: "updated", revision: 1 },
      { path: "lib/links.ts", content: "export {}", revision: 0 },
    ]);
  });
});

describe("isCreateWorkspaceRevision", () => {
  it("is true only for the initial 0/0 checkpoint", () => {
    expect(
      isCreateWorkspaceRevision({
        expectedWorkspaceRevision: 0,
        expectedFileRevision: 0,
      }),
    ).toBe(true);
    expect(
      isCreateWorkspaceRevision({
        expectedWorkspaceRevision: 1,
        expectedFileRevision: 0,
      }),
    ).toBe(false);
  });
});

describe("save result shaping", () => {
  it("builds success and conflict discriminants", () => {
    expect(shapeSaveSuccess({ workspaceRevision: 2, fileRevision: 3 })).toEqual({
      kind: "success",
      workspaceRevision: 2,
      fileRevision: 3,
    });

    expect(
      shapeSaveConflict({
        workspaceRevision: 4,
        fileRevision: 1,
      }),
    ).toEqual({
      kind: "conflict",
      workspaceRevision: 4,
      fileRevision: 1,
      error: "This file changed elsewhere. Reload and try again.",
    });

    expect(shapeSaveError("Nope")).toEqual({ kind: "error", error: "Nope" });
  });
});

describe("toProjectWorkspaceSnapshot", () => {
  it("sorts files and preserves revisions", () => {
    const snapshot = toProjectWorkspaceSnapshot({
      templateVersion: 1,
      workspaceRevision: 3,
      activeFile: "lib/links.ts",
      files: [
        { path: "lib/links.ts", content: "b", revision: 2 },
        { path: "app/page.tsx", content: "a", revision: 1 },
      ],
    });

    expect(snapshot).toEqual({
      templateVersion: 1,
      workspaceRevision: 3,
      activeFile: "lib/links.ts",
      files: [
        { path: "app/page.tsx", content: "a", revision: 1 },
        { path: "lib/links.ts", content: "b", revision: 2 },
      ],
    });
  });
});
