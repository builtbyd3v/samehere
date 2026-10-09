import { randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { GithubAdminClient } from "./admin";
import { storeEncryptedTokens } from "./store";

async function run(expiresAt: string | null) {
  const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
  const admin = { rpc, from: vi.fn() } as unknown as GithubAdminClient;
  await storeEncryptedTokens(admin, {
    ownerId: "owner-1",
    connectionId: "conn-1",
    epoch: 1,
    key: randomBytes(32),
    keyVersion: 1,
    tokens: { accessToken: "gho_test", refreshToken: null, expiresAt },
  });
  return rpc;
}

describe("storeEncryptedTokens", () => {
  it("sends NULL expiry for a non-expiring token", async () => {
    const rpc = await run(null);
    expect(rpc).toHaveBeenCalledWith(
      "upsert_github_credentials",
      expect.objectContaining({ p_expires_at: null })
    );
  });

  it("passes a real expiry through", async () => {
    const rpc = await run("2026-10-10T00:00:00.000Z");
    expect(rpc).toHaveBeenCalledWith(
      "upsert_github_credentials",
      expect.objectContaining({ p_expires_at: "2026-10-10T00:00:00.000Z" })
    );
  });
});
