import { redirect } from "next/navigation";

// WS10: post search deprecated with social surfaces.
export default function SearchPostsPage() {
  redirect("/home");
}
