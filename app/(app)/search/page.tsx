import { redirect } from "next/navigation";

// Search lives on the feed page; keep /search as a redirect for old links.
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = ((await searchParams).q ?? "").trim();
  redirect(q ? `/feed?search=1&q=${encodeURIComponent(q)}` : "/feed");
}
