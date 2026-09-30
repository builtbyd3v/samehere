import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import {
  FOCUS_AREAS,
  FOCUS_LABELS,
  STAGES,
  STAGE_LABELS,
  parseFocusAreas,
  parseStage,
  stageError,
} from "./stage";

const MIGRATION = "supabase/migrations/20261001100000_profiles_stage_focus.sql";

describe("stage / focus lists", () => {
  it("locks the allowlists and labels every value", () => {
    expect(STAGES).toEqual(["learning", "building", "internship_search", "interning", "job_search", "working"]);
    expect(FOCUS_AREAS).toEqual([
      "web", "mobile", "ai_ml", "data", "systems", "security", "cloud", "games", "hardware", "robotics",
    ]);
    expect(Object.keys(STAGE_LABELS)).toEqual([...STAGES]);
    expect(Object.keys(FOCUS_LABELS)).toEqual([...FOCUS_AREAS]);
  });
});

describe("parseStage", () => {
  it("accepts each stage and trims", () => {
    for (const s of STAGES) expect(parseStage(s)).toBe(s);
    expect(parseStage("  building ")).toBe("building");
  });

  it("rejects empty, non-strings, and anything not an exact match", () => {
    expect(parseStage("")).toBeNull();
    expect(parseStage(null)).toBeNull();
    expect(parseStage(42)).toBeNull();
    expect(parseStage("Building")).toBeNull();
    expect(parseStage("ninja")).toBeNull();
  });
});

describe("stageError", () => {
  it("allows empty, flags junk", () => {
    expect(stageError(null)).toBeNull();
    expect(stageError("")).toBeNull();
    expect(stageError("ninja")).toBe("Pick a stage from the list.");
    expect(stageError("working")).toBeNull();
  });
});

describe("parseFocusAreas", () => {
  it("dedupes and returns canonical order", () => {
    expect(parseFocusAreas([])).toEqual({ ok: true, data: [] });
    expect(parseFocusAreas(["ai_ml", "web", "web"])).toEqual({ ok: true, data: ["web", "ai_ml"] });
  });

  it("rejects more than 3, unknown values, and non-strings", () => {
    expect(parseFocusAreas(["web", "mobile", "data", "games"]).ok).toBe(false);
    expect(parseFocusAreas(["blockchain"]).ok).toBe(false);
    expect(parseFocusAreas([new Blob(["x"])]).ok).toBe(false);
  });

  it("treats a non-array as empty", () => {
    expect(parseFocusAreas("web")).toEqual({ ok: true, data: [] });
  });
});

describe("DB / TS lockstep", () => {
  it("every stage and focus value appears in the migration CHECKs", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    for (const v of [...STAGES, ...FOCUS_AREAS]) expect(sql).toContain(`'${v}'`);
  });
});
