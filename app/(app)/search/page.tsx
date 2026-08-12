import { redirect } from "next/navigation";

// WS10: people/post search deprecated with social surfaces.
export default function SearchPage() {
  redirect("/home");
}
