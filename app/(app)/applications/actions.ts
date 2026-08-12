"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { rediagnoseUser } from "@/lib/path/rediagnose";

export const APPLICATION_STATUSES = [
  "wishlist",
  "applied",
  "oa",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export type ApplicationRow = {
  id: string;
  user_id: string;
  listing_id: string | null;
  org: string;
  role: string;
  status: ApplicationStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ApplicationActionState = {
  error?: string;
  success?: boolean;
  id?: string;
};

function isStatus(value: string): value is ApplicationStatus {
  return (APPLICATION_STATUSES as readonly string[]).includes(value);
}

function revalidateApplications(listingId?: string | null) {
  revalidatePath("/applications");
  if (listingId) revalidatePath(`/jobs/${listingId}`);
}

// Manual org/role row. Status defaults to wishlist; listing_id stays null.
export async function createApplication(
  _prev: ApplicationActionState,
  formData: FormData,
): Promise<ApplicationActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const org = String(formData.get("org") ?? "").trim().slice(0, 120);
  const role = String(formData.get("role") ?? "").trim().slice(0, 120);
  const statusRaw = String(formData.get("status") ?? "wishlist").trim();
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 2000) || null;

  if (!org || !role) return { error: "Org and role are required." };
  const status: ApplicationStatus = isStatus(statusRaw) ? statusRaw : "wishlist";

  const { data, error } = await supabase
    .from("applications")
    .insert({
      user_id: user.id,
      org,
      role,
      status,
      notes,
      listing_id: null,
    })
    .select("id")
    .single();

  if (error) {
    // Table may not exist until WS1 lands — surface a clear message.
    if (error.message.includes("applications") || error.code === "42P01") {
      return { error: "Applications aren’t ready yet. Try again shortly." };
    }
    return { error: "Could not add application. Try again." };
  }

  revalidateApplications();
  return { success: true, id: data.id };
}

export async function updateApplicationStatus(
  id: string,
  status: string,
): Promise<ApplicationActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };
  if (!id) return { error: "Missing application." };
  if (!isStatus(status)) return { error: "Invalid status." };

  const { data, error } = await supabase
    .from("applications")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("listing_id")
    .maybeSingle();

  if (error) return { error: "Could not update status. Try again." };
  if (!data) return { error: "Application not found." };

  // OA / interview → flip path recipe (heuristic at minimum). Soft-fail so the
  // status update still succeeds if rediagnosis errors.
  if (status === "oa" || status === "interview") {
    try {
      await rediagnoseUser(supabase, user.id, {
        reason: status === "oa" ? "application_status_oa" : "application_status_interview",
      });
      revalidatePath("/home");
    } catch {
      // ponytail: status write already committed; path refresh is best-effort
    }
  }

  revalidateApplications(data.listing_id);
  return { success: true };
}

export async function deleteApplication(id: string): Promise<ApplicationActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };
  if (!id) return { error: "Missing application." };

  const { data, error } = await supabase
    .from("applications")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("listing_id")
    .maybeSingle();

  if (error) return { error: "Could not remove application. Try again." };

  revalidateApplications(data?.listing_id);
  return { success: true };
}

// Track a job listing: upsert by (user_id, listing_id) when already tracked,
// otherwise insert wishlist from listing org/title.
export async function addFromListing(listingId: string): Promise<ApplicationActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };
  if (!listingId) return { error: "Missing listing." };

  const { data: listing, error: listingErr } = await supabase
    .from("job_listings")
    .select("id, org, title")
    .eq("id", listingId)
    .maybeSingle();

  if (listingErr || !listing) return { error: "Listing not found." };

  const { data: existing } = await supabase
    .from("applications")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("listing_id", listingId)
    .maybeSingle();

  if (existing) {
    revalidateApplications(listingId);
    return { success: true, id: existing.id };
  }

  const { data, error } = await supabase
    .from("applications")
    .insert({
      user_id: user.id,
      listing_id: listing.id,
      org: listing.org,
      role: listing.title,
      status: "wishlist",
    })
    .select("id")
    .single();

  if (error) {
    if (error.message.includes("applications") || error.code === "42P01") {
      return { error: "Applications aren’t ready yet. Try again shortly." };
    }
    // Unique race: another request inserted first.
    if (error.code === "23505") {
      revalidateApplications(listingId);
      return { success: true };
    }
    return { error: "Could not track listing. Try again." };
  }

  revalidateApplications(listingId);
  return { success: true, id: data.id };
}
