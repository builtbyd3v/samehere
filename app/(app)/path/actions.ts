"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rediagnoseUser } from "@/lib/path/rediagnose";

export type RediagnosisActionState = {
  error?: string;
  overCap?: boolean;
  success?: boolean;
};

/**
 * Manual “something changed” / re-run path.
 * Runs inline rediagnosis (force) then returns to /home.
 */
export async function requestRediagnosis(
  _prev: RediagnosisActionState,
  formData: FormData,
): Promise<RediagnosisActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const blockerNote = String(formData.get("blocker") ?? "").trim().slice(0, 400);
  const goRedo = String(formData.get("goto") ?? "") === "redo";
  if (goRedo) redirect("/path/redo");

  const outcome = await rediagnoseUser(supabase, user.id, {
    reason: "manual",
    force: true,
    blockerNote: blockerNote || undefined,
  });

  if (!outcome.ok) {
    if (outcome.reason === "over_cap") return { overCap: true };
    if (outcome.reason === "no_context") {
      return { error: "Finish path intake first, then try again." };
    }
    return { error: "Could not refresh your path. Try again." };
  }

  revalidatePath("/home");
  revalidatePath("/path/redo");
  redirect("/home");
}
