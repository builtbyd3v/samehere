import { redirect } from "next/navigation";

// WS10: saved posts deprecated.
export default function SavedPage() {
  redirect("/home");
}
