import { fail } from "@/lib/portfolio/errors";
import { requireOwner, resultResponse } from "@/lib/portfolio/http";
import { getOwnerSettings, parsePublishFlags, saveOwnerSettings } from "@/lib/portfolio/owner";
import { isPro } from "@/lib/pro";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;
  return resultResponse(await getOwnerSettings(auth.client, auth.userId));
}

export async function PATCH(request: Request) {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return resultResponse(fail("Invalid input.", 400));
  }
  const parsed = parsePublishFlags(body);
  if (!parsed.ok) return resultResponse(parsed);
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_private, is_pro, pro_until")
    .eq("id", auth.userId)
    .maybeSingle();
  return resultResponse(
    await saveOwnerSettings(auth.client, auth.userId, parsed.data, parsed.data.section_order, {
      isPrivate: profile?.is_private === true,
      isPro: isPro(profile ?? { is_pro: false, pro_until: null }),
    })
  );
}
