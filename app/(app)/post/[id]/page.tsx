import { redirect } from "next/navigation";

// WS10: post permalinks deprecated.
export default function PostPage() {
  redirect("/home");
}
