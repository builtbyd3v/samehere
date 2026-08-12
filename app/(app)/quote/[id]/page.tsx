import { redirect } from "next/navigation";

// WS10: quote permalinks deprecated.
export default function QuotePage() {
  redirect("/home");
}
