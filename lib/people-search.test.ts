import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { compactCandidate, peopleSearchCore } from "./people-search";

function baseCandidate(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "cand-1",
    username: "student1",
    display_name: null,
    avatar_url: null,
    is_pro: false,
    is_founder: false,
    is_campus_founder: false,
    verified_student: false,
    year: "junior",
    major: "cs",
    goals: null,
    bio: null,
    profile_school: null,
    ...overrides,
  };
}

describe("compactCandidate", () => {
  it("appends flags=verified-student for a verified candidate", () => {
    const out = compactCandidate(baseCandidate({ verified_student: true }) as never, []);
    expect(out).toContain("flags=verified-student");
  });

  it("omits flags entirely for a candidate with no server-derived flags", () => {
    const out = compactCandidate(baseCandidate() as never, []);
    expect(out).not.toContain("flags=");
  });

  it("combines multiple flags comma-joined", () => {
    const out = compactCandidate(
      baseCandidate({ verified_student: true, is_founder: true }) as never,
      [],
    );
    expect(out).toContain("flags=verified-student,founder");
  });

  it("keeps flags outside the untrusted ⟦ ⟧ delimiter, alongside id=", () => {
    const out = compactCandidate(baseCandidate({ verified_student: true }) as never, []);
    const delimiterStart = out.indexOf("⟦");
    const flagsIndex = out.indexOf("flags=");
    expect(flagsIndex).toBeGreaterThan(-1);
    expect(flagsIndex).toBeLessThan(delimiterStart);
  });
});

// Minimal fake SupabaseClient covering only the calls peopleSearchCore makes
// when aiEnabled() is false (no OPENAI_API_KEY in the test env) -- the model
// call is skipped entirely, so the prefilter path is what's under test here.
function makeFakeClient(candidateRows: unknown[], eqCalls: [string, unknown][]) {
  let profilesCall = 0;
  const client = {
    from(table: string) {
      if (table === "profiles") {
        profilesCall++;
        if (profilesCall === 1) {
          // viewer's own is_pro/pro_until lookup
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: { is_pro: false, pro_until: null } }),
              }),
            }),
          };
        }
        // candidate prefilter query
        const builder = {
          select: () => builder,
          or: () => builder,
          neq: () => builder,
          eq: (col: string, val: unknown) => {
            eqCalls.push([col, val]);
            return builder;
          },
          limit: () => builder,
          returns: () => Promise.resolve({ data: candidateRows }),
        };
        return builder;
      }
      if (table === "experiences") {
        return { select: () => ({ or: () => ({ limit: () => Promise.resolve({ data: [] }) }) }) };
      }
      throw new Error(`unexpected table in test fake: ${table}`);
    },
    rpc(name: string) {
      if (name === "get_blocked_ids") return Promise.resolve({ data: [] });
      throw new Error(`unexpected rpc in test fake: ${name}`);
    },
  };
  return client as unknown as SupabaseClient;
}

describe("peopleSearchCore verifiedOnly", () => {
  it("adds a verified_student=true filter to the candidate prefilter when verifiedOnly is set", async () => {
    const eqCalls: [string, unknown][] = [];
    const rows = [
      baseCandidate({ id: "a", verified_student: true }),
      baseCandidate({ id: "b", verified_student: true }),
      baseCandidate({ id: "c", verified_student: true }),
      baseCandidate({ id: "d", verified_student: true }),
      baseCandidate({ id: "e", verified_student: true }),
    ];
    const client = makeFakeClient(rows, eqCalls);
    const state = await peopleSearchCore(client, { id: "viewer" }, "cs juniors", { verifiedOnly: true });
    expect(eqCalls).toContainEqual(["verified_student", true]);
    expect(state.results?.length).toBe(5);
  });

  it("does not filter by verified_student when verifiedOnly is not set", async () => {
    const eqCalls: [string, unknown][] = [];
    const rows = [
      baseCandidate({ id: "a" }),
      baseCandidate({ id: "b" }),
      baseCandidate({ id: "c" }),
      baseCandidate({ id: "d" }),
      baseCandidate({ id: "e" }),
    ];
    const client = makeFakeClient(rows, eqCalls);
    await peopleSearchCore(client, { id: "viewer" }, "cs juniors", {});
    expect(eqCalls).not.toContainEqual(["verified_student", true]);
  });
});
