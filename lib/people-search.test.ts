import { describe, it, expect, vi } from "vitest";
import { peopleSearchCore } from "./people-search";

function makeRpcClient(data: unknown[] | null, error: unknown = null) {
  const rpc = vi.fn().mockResolvedValue({ data, error });
  return { client: { rpc } as never, rpc };
}

describe("peopleSearchCore", () => {
  it("returns empty without calling the RPC when the query has no tokens", async () => {
    const { client, rpc } = makeRpcClient([]);
    const state = await peopleSearchCore(client, { id: "viewer" }, "   ");
    expect(state).toEqual({ empty: true });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("maps search_people rows and never asks for a reason", async () => {
    const { client, rpc } = makeRpcClient([
      {
        id: "a",
        username: "ada",
        display_name: "Ada",
        avatar_url: null,
        is_pro: false,
        is_founder: false,
        is_campus_founder: false,
        verified_student: true,
        open_to: ["study"],
      },
    ]);
    const state = await peopleSearchCore(client, { id: "viewer" }, "ada");
    expect(rpc).toHaveBeenCalledWith("search_people", {
      p_query: "ada",
      p_limit: 20,
      p_offset: 0,
    });
    expect(state.results).toEqual([
      {
        id: "a",
        username: "ada",
        display_name: "Ada",
        avatar_url: null,
        is_pro: false,
        is_founder: false,
        is_campus_founder: false,
        verified_student: true,
        reason: null,
      },
    ]);
  });

  it("ignores verifiedOnly / skipQuota — no extra filters, no quota RPC", async () => {
    const { client, rpc } = makeRpcClient([]);
    await peopleSearchCore(client, { id: "viewer" }, "cs juniors", {
      verifiedOnly: true,
      skipQuota: true,
    });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("search_people", expect.any(Object));
  });
});
