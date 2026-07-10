import { redirect } from "next/navigation";

// Leaderboard moved into the Community tab; keep this route as a redirect
// for old links — same shim pattern as /dashboard and /search.
export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const scope = (await searchParams).scope;
  redirect(scope === "peers" ? "/community?tab=leaderboard&scope=peers" : "/community?tab=leaderboard");
}
