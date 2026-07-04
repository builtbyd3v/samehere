import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function StartMessagePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (!profile) notFound();
  if (profile.id === user.id) redirect("/messages");

  const { data: conversationId, error } = await supabase.rpc("get_or_create_dm", {
    p_recipient: profile.id,
  });

  if (error || !conversationId) redirect("/messages");

  redirect(`/messages/${conversationId}`);
}
