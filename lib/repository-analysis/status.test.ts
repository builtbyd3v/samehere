import { describe, expect, it } from "vitest";
import type { RepositoryAnalysis } from "@/types/portfolio";
import { cancelCopy, isLeaseExpired, presentAnalysis } from "./status";

function row(partial: Partial<RepositoryAnalysis>): RepositoryAnalysis {
  return {
    id: "a1",
    owner_id: "o1",
    project_id: null,
    connection_id: "c1",
    connection_epoch: 1,
    repository_id: 9,
    repository_full_name: "ada/bus",
    commit_sha: "a".repeat(40),
    request_key: "k",
    prompt_version: "repo-analysis-v1",
    status: "queued",
    attempt_id: "t1",
    parent_analysis_id: null,
    parent_attempt_id: null,
    lease_owner: "w1",
    lease_expires_at: "2026-09-10T12:00:00Z",
    draft: null,
    evidence: null,
    coverage: null,
    model: null,
    token_input: null,
    token_output: null,
    estimated_cost_usd: null,
    safe_error: null,
    created_at: "2026-09-10T11:00:00Z",
    started_at: null,
    updated_at: "2026-09-10T11:00:00Z",
    completed_at: null,
    ...partial,
  };
}

describe("presentAnalysis", () => {
  it("maps an expired lease to interrupted with retry", () => {
    const presented = presentAnalysis(row({ status: "analyzing", lease_expires_at: "2026-09-10T12:00:00Z" }), new Date("2026-09-10T12:00:01Z"));
    expect(presented).toEqual({ kind: "interrupted", status: "analyzing", canRetry: true });
    expect(isLeaseExpired(row({ lease_expires_at: "2026-09-10T12:00:00Z" }), new Date("2026-09-10T12:00:01Z"))).toBe(true);
  });

  it("keeps a live stage and a succeeded draft", () => {
    expect(presentAnalysis(row({ status: "reading_repository", lease_expires_at: "2026-09-10T12:02:00Z" }), new Date("2026-09-10T12:00:00Z")).kind).toBe(
      "reading_repository"
    );
    expect(
      presentAnalysis(
        row({
          status: "succeeded",
          project_id: "p1",
          draft: {
            title: "Bus",
            summary: "",
            description: "",
            technologies: [],
            keyFeatures: [],
            uncertaintyNotes: [],
            evidence: [],
          },
        })
      )
    ).toMatchObject({ kind: "succeeded", projectId: "p1" });
  });

  it("uses truthful cancel copy", () => {
    expect(cancelCopy()).toMatch(/Draft creation stopped, nothing published/);
    expect(cancelCopy()).toMatch(/discarded/);
    expect(cancelCopy()).not.toMatch(/Publication has stopped|already unpublished|never reached the provider/i);
    expect(presentAnalysis(row({ status: "cancelled" }))).toMatchObject({
      kind: "cancelled",
      copy: cancelCopy(),
    });
  });

  it("queued with a null lease uses created_at + 120s", () => {
    const queued = row({ status: "queued", lease_expires_at: null, created_at: "2026-09-10T11:00:00Z" });
    expect(presentAnalysis(queued, new Date("2026-09-10T11:01:59Z")).kind).toBe("queued");
    expect(presentAnalysis(queued, new Date("2026-09-10T11:02:00Z")).kind).toBe("interrupted");
  });

  it("in-progress with a null lease is interrupted immediately", () => {
    expect(
      presentAnalysis(row({ status: "analyzing", lease_expires_at: null, created_at: "2026-09-10T11:00:00Z" }), new Date("2026-09-10T11:00:01Z")).kind
    ).toBe("interrupted");
  });
});
