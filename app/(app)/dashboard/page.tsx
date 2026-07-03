import { redirect } from "next/navigation";

// Dashboard retired — its logic (follow requests, suggested users, followed
// feed) moved into the feed's Following tab. This route just redirects there.
export default function DashboardPage() {
  redirect("/feed?tab=following");
}
