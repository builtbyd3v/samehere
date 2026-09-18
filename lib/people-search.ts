import type { SupabaseClient } from "@supabase/supabase-js";
import { tokensFor } from "@/lib/search";

export type PeopleSearchResult = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_pro: boolean;
  is_founder: boolean;
  is_campus_founder: boolean;
  verified_student: boolean;
  reason: string | null;
};

export type PeopleSearchState = {
  results?: PeopleSearchResult[];
  empty?: boolean;
  error?: string;
};

export type PeopleSearchOpts = {
  /** @deprecated no-op; AI people search is retired */
  skipQuota?: boolean;
  /** @deprecated no-op; AI people search is retired */
  verifiedOnly?: boolean;
};

export async function peopleSearchCore(
  supabase: SupabaseClient,
  _user: { id: string },
  query: string,
  _opts: PeopleSearchOpts = {},
): Promise<PeopleSearchState> {
  if (!tokensFor(query).length) return { empty: true };

  const { data, error } = await supabase.rpc("search_people", {
    p_query: query,
    p_limit: 20,
    p_offset: 0,
  });
  if (error || !data?.length) return { empty: true };

  const rows = data as Omit<PeopleSearchResult, "reason">[];
  return {
    results: rows.map((r) => ({
      id: r.id,
      username: r.username,
      display_name: r.display_name,
      avatar_url: r.avatar_url,
      is_pro: r.is_pro,
      is_founder: r.is_founder,
      is_campus_founder: r.is_campus_founder,
      verified_student: r.verified_student,
      reason: null,
    })),
  };
}
