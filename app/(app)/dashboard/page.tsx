import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import FollowRequests, { type FollowRequest } from "@/components/profile/FollowRequests";
import FollowButton from "@/components/profile/FollowButton";
import PostCard, { POST_SELECT, type FeedPost } from "@/components/feed/PostCard";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // proxy already gates this route; this is just a type-narrowing guard.
  if (!user) return null;

  const viewerId = user.id;

  // Wave 1 — all key off user.id, independent of each other.
  const [{ data: profile }, { data: requests }, { data: myFollows }] = await Promise.all([
    supabase.from("profiles").select("username, display_name").eq("id", user.id).single(),
    supabase
      .from("follows")
      .select("follower_id, requester:profiles!follows_follower_id_fkey(username, display_name, avatar_url)")
      .eq("following_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .returns<FollowRequest[]>(),
    supabase.from("follows").select("following_id, status").eq("follower_id", user.id),
  ]);

  const acceptedIds = (myFollows ?? []).filter((f) => f.status === "accepted").map((f) => f.following_id);
  const excludeIds = [user.id, ...(myFollows ?? []).map((f) => f.following_id)]; // never empty (has me)

  // Wave 2 — depends on wave 1's ids.
  // ponytail: dashboard feed is first-page only; add a cursor load-more if the followed feed grows.
  // ponytail: followed users' own posts only; reposts-in-feed deferred.
  const [{ data: feed }, { data: suggested }] = await Promise.all([
    acceptedIds.length
      ? supabase
          .from("posts")
          .select(POST_SELECT)
          .in("user_id", acceptedIds)
          .order("created_at", { ascending: false })
          .limit(20)
          .returns<FeedPost[]>()
      : Promise.resolve({ data: [] as FeedPost[] }),
    supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .not("id", "in", `(${excludeIds.join(",")})`)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <h1 className="text-2xl font-semibold tracking-[-0.02em]">
        Welcome back{profile ? `, ${profile.display_name ?? profile.username}` : ""}.
      </h1>

      {requests && requests.length > 0 && (
        <div className="mt-8">
          <FollowRequests requests={requests} />
        </div>
      )}

      {suggested && suggested.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-medium">People to follow</h2>
          <div className="space-y-2">
            {suggested.map((s) => {
              const name = s.display_name ?? s.username;
              return (
                <div key={s.id} className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-3">
                  {s.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.avatar_url}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-full border border-[var(--border)] object-cover"
                    />
                  ) : (
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-sm font-semibold text-[var(--ink-muted)]">
                      {name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1 text-sm">
                    <Link href={`/profile/${s.username}`} className="font-medium hover:underline">
                      {name}
                    </Link>
                    <span className="ml-1.5 text-[var(--ink-muted)]">@{s.username}</span>
                    {/* TODO(Phase 12): AI connection prompt — one sentence on why to follow */}
                  </div>
                  <FollowButton targetId={s.id} initial="none" />
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium">From people you follow</h2>
        {feed && feed.length > 0 ? (
          <div>
            {feed.map((post) => (
              <PostCard key={post.id} post={post} viewerId={viewerId} />
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-[var(--ink-muted)]">
            Your feed is empty — <Link href="/search" className="underline hover:no-underline">find people to follow</Link>.
          </p>
        )}
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        {profile && (
          <Link
            href={`/profile/${profile.username}`}
            className="rounded-md border border-[var(--border-strong)] px-3 py-1.5 text-sm font-medium transition active:opacity-80"
          >
            Your profile
          </Link>
        )}
        <Link
          href="/feed"
          className="btn-inset rounded-md bg-[var(--ink)] px-3 py-1.5 text-sm font-medium text-[var(--canvas)] transition active:opacity-80"
        >
          Go to feed
        </Link>
      </div>
    </main>
  );
}
