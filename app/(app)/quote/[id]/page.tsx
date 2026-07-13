import { redirect, notFound } from "next/navigation";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Quote-repost creation is retired (flag off); this route only needs to keep
// old /quote/[id] links alive by resolving to the underlying post. Anon uses
// the same SECURITY DEFINER RPC the old public render used (RLS-safe, works
// for logged-out visitors); logged-in uses a direct RLS-scoped select.
function anonSupabase() {
  return createAnonClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let postId: string | null = null;

  if (user) {
    const { data } = await supabase
      .from("reposts")
      .select("post_id")
      .eq("id", id)
      .not("quote_text", "is", null)
      .maybeSingle();
    postId = data?.post_id ?? null;
  } else {
    const anon = anonSupabase();
    const rpc = anon.rpc.bind(anon) as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => PromiseLike<{ data: { post_id: string }[] | null }>;
    const rows = await rpc("get_public_quote", { p_id: id }).then((r) => r.data ?? []);
    postId = rows[0]?.post_id ?? null;
  }

  if (!postId) notFound();
  redirect(`/post/${postId}`);
}
