import { redirect } from "next/navigation";

// WS10: leaderboard deprecated.
export default function LeaderboardPage() {
  redirect("/home");
}
