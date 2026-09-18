import { cookies } from "next/headers";
import { createClient as createAnon } from "@supabase/supabase-js";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { useAnonPortfolioReads } from "./anon-policy";

export type PortfolioClient = SupabaseClient<Database>;
export type PortfolioDb = PortfolioClient;

export { useAnonPortfolioReads };

export function createAnonPortfolioClient(): PortfolioClient {
  return createAnon<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export async function hasPortfolioAuthCookie(): Promise<boolean> {
  const store = await cookies();
  return store.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
}

/** Session client when an auth cookie exists. Anon only when there is no session cookie. */
export async function portfolioReadClient(hasAuthCookie: boolean): Promise<PortfolioClient> {
  if (hasAuthCookie) return createSessionClient();
  return createAnonPortfolioClient();
}

export async function portfolioViewerClient(): Promise<PortfolioClient> {
  return portfolioReadClient(await hasPortfolioAuthCookie());
}
