import { redirect } from "next/navigation";

// Dashboard retired — signed-in home is the recipe path (WS3/WS4).
export default function DashboardPage() {
  redirect("/home");
}
