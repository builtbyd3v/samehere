import { describe, expect, it, vi } from "vitest";
import { githubAdminForTest } from "./admin";
import { credentialsAad } from "./config";
import { encryptSecret } from "./crypto";
import { GithubHttpError } from "./http";
import { accessTokenForConnection } from "./tokens";

const KEY = Buffer.alloc(32, 9);
const OWNER = "owner-1";
const CONN = "conn-1";

function rpcClient(handlers: Record<string, (args?: Record<string, unknown>) => { data: unknown; error: null | { message: string } }>) {
  return githubAdminForTest({
    rpc: async (name, args) => handlers[name]?.(args) ?? { data: null, error: { message: `missing ${name}` } },
    from: () => {
      throw new Error("unused");
    },
  });
}

describe("accessTokenForConnection", () => {
  it("returns a live token when it has not expired", async () => {
    const packed = encryptSecret({
      key: KEY,
      keyVersion: 1,
      plaintext: "gho_live",
      aad: credentialsAad(OWNER, CONN, 1),
    });
    const admin = rpcClient({
      get_github_credentials: () => ({
        data: [
          {
            connection_id: CONN,
            owner_id: OWNER,
            connection_epoch: 3,
            access_token_encrypted: packed,
            refresh_token_encrypted: null,
            expires_at: new Date(Date.now() + 60_000).toISOString(),
            key_version: 1,
          },
        ],
        error: null,
      }),
    });
    const live = await accessTokenForConnection(admin, {
      connectionId: CONN,
      ownerId: OWNER,
      epoch: 3,
      login: "ada",
      githubUserId: 42,
      key: KEY,
      keyVersion: 1,
    });
    expect(live.accessToken).toBe("gho_live");
  });

  it("refreshes an expired token, revalidates /user, and stores the new ciphertext", async () => {
    const aad = credentialsAad(OWNER, CONN, 1);
    const access = encryptSecret({ key: KEY, keyVersion: 1, plaintext: "gho_old", aad });
    const refresh = encryptSecret({ key: KEY, keyVersion: 1, plaintext: "ghr_old", aad });
    const upsert = vi.fn<(args?: Record<string, unknown>) => { data: null; error: null }>((_args) => ({
      data: null,
      error: null,
    }));
    const admin = rpcClient({
      get_github_credentials: () => ({
        data: [
          {
            connection_id: CONN,
            owner_id: OWNER,
            connection_epoch: 3,
            access_token_encrypted: access,
            refresh_token_encrypted: refresh,
            expires_at: new Date(Date.now() - 1000).toISOString(),
            key_version: 1,
          },
        ],
        error: null,
      }),
      upsert_github_credentials: upsert,
    });
    vi.stubEnv("GITHUB_CLIENT_ID", "id");
    vi.stubEnv("GITHUB_CLIENT_SECRET", "secret");
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      if (url.includes("/user")) {
        return new Response(JSON.stringify({ id: 42, login: "ada" }));
      }
      return new Response(JSON.stringify({ access_token: "gho_new", refresh_token: "ghr_new" }));
    });
    const live = await accessTokenForConnection(admin, {
      connectionId: CONN,
      ownerId: OWNER,
      epoch: 3,
      login: "ada",
      githubUserId: 42,
      key: KEY,
      keyVersion: 1,
      fetchImpl,
    });
    expect(live.accessToken).toBe("gho_new");
    expect(upsert).toHaveBeenCalled();
    const stored = upsert.mock.calls[0][0];
    expect(String(stored?.p_access_token_encrypted ?? "")).not.toContain("gho_new");
    expect(fetchImpl.mock.calls.some((call) => String(call[0]).includes("/user"))).toBe(true);
    vi.unstubAllEnvs();
  });

  it("does not mark reauthorization on a transient rate limit", async () => {
    const aad = credentialsAad(OWNER, CONN, 1);
    const access = encryptSecret({ key: KEY, keyVersion: 1, plaintext: "gho_old", aad });
    const refresh = encryptSecret({ key: KEY, keyVersion: 1, plaintext: "ghr_old", aad });
    const mark = vi.fn<(args?: Record<string, unknown>) => { data: null; error: null }>(() => ({ data: null, error: null }));
    const admin = rpcClient({
      get_github_credentials: () => ({
        data: [
          {
            connection_id: CONN,
            owner_id: OWNER,
            connection_epoch: 3,
            access_token_encrypted: access,
            refresh_token_encrypted: refresh,
            expires_at: new Date(Date.now() - 1000).toISOString(),
            key_version: 1,
          },
        ],
        error: null,
      }),
      mark_github_connection_status: mark,
    });
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response("rate limited", { status: 429 }));
    await expect(
      accessTokenForConnection(admin, {
        connectionId: CONN,
        ownerId: OWNER,
        epoch: 3,
        login: "ada",
        githubUserId: 42,
        key: KEY,
        keyVersion: 1,
        fetchImpl,
      })
    ).rejects.toMatchObject({ kind: "rate_limit" });
    expect(mark).not.toHaveBeenCalled();
  });

  it("marks reauthorization when refresh is impossible", async () => {
    const packed = encryptSecret({
      key: KEY,
      keyVersion: 1,
      plaintext: "gho_old",
      aad: credentialsAad(OWNER, CONN, 1),
    });
    const mark = vi.fn<(args?: Record<string, unknown>) => { data: null; error: null }>(() => ({ data: null, error: null }));
    const admin = rpcClient({
      get_github_credentials: () => ({
        data: [
          {
            connection_id: CONN,
            owner_id: OWNER,
            connection_epoch: 3,
            access_token_encrypted: packed,
            refresh_token_encrypted: null,
            expires_at: new Date(Date.now() - 1000).toISOString(),
            key_version: 1,
          },
        ],
        error: null,
      }),
      mark_github_connection_status: mark,
    });
    await expect(
      accessTokenForConnection(admin, {
        connectionId: CONN,
        ownerId: OWNER,
        epoch: 3,
        login: "ada",
        githubUserId: 42,
        key: KEY,
        keyVersion: 1,
      })
    ).rejects.toBeInstanceOf(GithubHttpError);
    expect(mark).toHaveBeenCalledWith(expect.objectContaining({ p_status: "reauthorization_needed" }));
  });
});
