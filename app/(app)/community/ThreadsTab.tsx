import { createClient } from "@/lib/supabase/server";
import PostComposer from "@/components/feed/PostComposer";
import PostCard, { POST_SELECT, PAGE, type FeedPost } from "@/components/feed/PostCard";
import EmptyState from "@/components/ui/EmptyState";
import { attachSignedMedia } from "@/lib/media";

// Weekly community prompt. current_thread_id() is the same definer fn the
// posts INSERT RLS policy checks against, so "the open thread" here always
// matches what a post is actually allowed to answer (America/New_York
// boundary lives in that one SQL fn, not duplicated here).
//
// No AI on this surface -- the composer runs with hideAi so answering the
// weekly prompt is the user's own thinking, and the composer disappears once
// they've answered (one answer per prompt).
export default async function ThreadsTab() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const viewerId = user?.id ?? null;

  const [{ data: openId }, { data: recap }] = await Promise.all([
    supabase.rpc("current_thread_id"),
    supabase
      .from("threads")
      .select("id, prompt, summary, week_start")
      .not("summary", "is", null)
      .order("week_start", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  let openThread: { id: string; prompt: string } | null = null;
  let responses: FeedPost[] = [];
  let hasAnswered = false;
  if (openId) {
    const [{ data: thread }, { data: posts }, { data: blockedIds }, { data: mine }] = await Promise.all([
      supabase.from("threads").select("id, prompt").eq("id", openId).maybeSingle(),
      supabase
        .from("posts")
        .select(POST_SELECT)
        .eq("thread_id", openId)
        .order("created_at", { ascending: false })
        .limit(PAGE)
        .returns<FeedPost[]>(),
      viewerId ? supabase.rpc("get_blocked_ids") : Promise.resolve({ data: [] as string[] }),
      viewerId
        ? supabase.from("posts").select("id").eq("thread_id", openId).eq("user_id", viewerId).limit(1).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    openThread = thread ?? null;
    hasAnswered = !!mine;
    const blocked = new Set(blockedIds ?? []);
    const filtered = (posts ?? []).filter((p) => !blocked.has(p.user_id));
    responses = await attachSignedMedia(supabase, filtered);
  }

  if (!openThread && !recap) {
    return <EmptyState title="No prompt this week" description="Check back Monday." />;
  }

  return (
    <div className="mt-5 flex flex-col gap-4">
      {openThread && (
        <>
          <h2 className="text-xl font-semibold leading-snug tracking-[-0.01em] text-[var(--ink)]">
            {openThread.prompt}
          </h2>

          {viewerId && !hasAnswered && <PostComposer threadId={openThread.id} hideAi />}

          {responses.length === 0 ? (
            <EmptyState title="No answers yet" description="Be the first to respond." />
          ) : (
            <div className="flex flex-col gap-3">
              {responses.map((post) => (
                <PostCard key={post.id} post={post} viewerId={viewerId} />
              ))}
            </div>
          )}
        </>
      )}

      {recap && (
        <section className="card p-4 sm:p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--ink-faint)]">Last week</p>
          <h3 className="mt-1 font-semibold text-[var(--ink)]">{recap.prompt}</h3>
          <p className="mt-1.5 text-sm text-[var(--ink-muted)]">{recap.summary}</p>
        </section>
      )}
    </div>
  );
}
