import { redirect } from "next/navigation";

// WS10: social feed deprecated — keep file so old links resolve.
export default function FeedPage() {
  redirect("/home");
}
