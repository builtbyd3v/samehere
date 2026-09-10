import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Database } from "@/types/database.types";
import { OWNER_GITHUB_CONNECTION_COLUMNS } from "./contracts";

type CommitArgs = Database["public"]["Functions"]["commit_repository_analysis"]["Args"];
type FinalizeArgs = Database["public"]["Functions"]["finalize_repository_analysis"]["Args"];
type ReserveArgs = Database["public"]["Functions"]["reserve_repository_analysis"]["Args"];
type SnapshotArgs = Database["public"]["Functions"]["replace_github_contribution_snapshot"]["Args"];

function commitArgs(args: CommitArgs): CommitArgs {
  return args;
}

function reserveArgs(args: ReserveArgs): ReserveArgs {
  return args;
}

describe("generated RPC types", () => {
  it("requires p_prompt_version on reserve and accepts it on commit", () => {
    const reserved = reserveArgs({
      p_project_id: null,
      p_repository_id: 1,
      p_repository_full_name: "ada/bus",
      p_commit_sha: "a".repeat(40),
      p_request_key: "repo:1:sha:aaa:pv:repo-analysis-v1",
      p_prompt_version: "repo-analysis-v1",
    });
    expect(reserved.p_prompt_version).toBe("repo-analysis-v1");

    const committed = commitArgs({
      p_analysis_id: "a1",
      p_attempt_id: "t1",
      p_worker_id: "w1",
      p_connection_epoch: 1,
      p_status: "failed",
      p_prompt_version: "repo-analysis-v1",
    });
    expect(committed.p_prompt_version).toBe("repo-analysis-v1");

    const finalized = (args: FinalizeArgs): FinalizeArgs => args;
    expect(
      finalized({
        p_analysis_id: "a1",
        p_attempt_id: "t1",
        p_worker_id: "w1",
        p_connection_epoch: 1,
        p_status: "succeeded",
        p_prompt_version: "repo-analysis-v1",
      }).p_prompt_version
    ).toBe("repo-analysis-v1");

    const snapshot = (args: SnapshotArgs): SnapshotArgs => args;
    expect(
      snapshot({
        p_connection_id: "c1",
        p_expected_epoch: 1,
        p_days: [{ date: "2026-01-01", count: 1, level: 1 }],
        p_from: "2025-09-10",
        p_to: "2026-09-10",
      }).p_from
    ).toBe("2025-09-10");
  });

  it("keeps owner connection selects free of sync_cursor", () => {
    expect(OWNER_GITHUB_CONNECTION_COLUMNS).not.toMatch(/sync_cursor/);
    const status = readFileSync(new URL("../../app/api/integrations/github/status/route.ts", import.meta.url), "utf8");
    const analyses = readFileSync(new URL("../../app/api/portfolio/analyses/route.ts", import.meta.url), "utf8");
    const repos = readFileSync(new URL("../../app/api/integrations/github/repos/route.ts", import.meta.url), "utf8");
    expect(status).toContain("OWNER_GITHUB_CONNECTION_COLUMNS");
    expect(status).not.toMatch(/sync_cursor/);
    expect(analyses).toContain("OWNER_GITHUB_CONNECTION_COLUMNS");
    expect(analyses).not.toMatch(/sync_cursor/);
    expect(repos).toContain("OWNER_GITHUB_CONNECTION_COLUMNS");
    expect(repos).not.toMatch(/auth\.client[\s\S]*sync_cursor/);
  });
});
