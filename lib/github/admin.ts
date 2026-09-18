import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export type GithubAdminClient = Pick<SupabaseClient<Database>, "rpc" | "from">;

export function asGithubAdmin(client: GithubAdminClient): GithubAdminClient {
  return client;
}

/**
 * Test assertion only. Not a query builder and not used in production.
 * Real `SupabaseClient.rpc`/`from` stay typed at call sites.
 */
export function githubAdminForTest(impl: {
  rpc: (
    fn: string,
    args?: Record<string, unknown>
  ) => PromiseLike<{ data: unknown; error: { message?: string } | null }>;
  from: (table: string) => unknown;
}): GithubAdminClient {
  return impl as never;
}
