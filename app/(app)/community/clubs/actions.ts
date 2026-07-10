"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ClubActionState = { error?: string; ok?: boolean; slug?: string };

// Mirrors the DB CHECKs in 20260714140000_clubs.sql so bad input gets a clean
// message instead of a raw constraint violation. The DB stays the source of
// truth -- these are just fast, specific errors.
const SLUG_RE = /^[a-z0-9-]{3,40}$/;
const RESERVED_SLUGS = new Set(["new", "create", "edit", "api"]);

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 40);
}

function slugError(slug: string): string | null {
  if (!SLUG_RE.test(slug)) {
    return "URL must be 3-40 characters: lowercase letters, numbers, or hyphens.";
  }
  if (RESERVED_SLUGS.has(slug)) return "That URL is reserved.";
  return null;
}

// Mutations are only ever handed a clubId, but the real route is
// /community/clubs/[slug] (see ClubsTab), not the id -- look the slug up once
// so revalidatePath targets the page the user is actually looking at, same
// pattern as `/profile/${username}` in settings/actions.ts.
async function clubDetailPath(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clubId: string,
): Promise<string | null> {
  const { data } = await supabase.from("clubs").select("slug").eq("id", clubId).maybeSingle();
  return data ? `/community/clubs/${data.slug}` : null;
}

// Maps a raised Postgres exception to a friendly, user-safe message. RAISE
// messages in this codebase's definer functions are short and already
// user-safe (e.g. 'already a member') -- pass those through as-is; only
// unique_violation and the rate-limit RAISE get a custom rewrite.
function friendlyDbError(error: { code?: string; message?: string } | null): string {
  if (!error) return "Something went wrong.";
  if (error.code === "23505") return "That URL is taken.";
  const message = error.message ?? "";
  if (message.includes("rate limit")) return "You've created too many clubs today.";
  // Postgres wraps RAISE EXCEPTION text verbatim in error.message.
  const known = [
    "already a member",
    "not a member",
    "not authorized",
    "no such club",
    "no such member",
    "cannot join this club",
    "invalid role",
    "not authenticated",
    "account suspended",
    "cannot act on a pending member",
    "the last owner cannot leave; transfer ownership first",
    "cannot demote the last owner",
  ];
  const hit = known.find((k) => message.includes(k));
  return hit ? hit.charAt(0).toUpperCase() + hit.slice(1) : "Something went wrong.";
}

export async function createClub(_prev: ClubActionState, formData: FormData): Promise<ClubActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const name = String(formData.get("name") ?? "").trim();
  const purpose = String(formData.get("purpose") ?? "").trim();
  // CreateClubModal pairs the checkbox (checked -> "true") with a same-named
  // hidden fallback (-> "false") placed after it in the DOM, so FormData.get()
  // (which returns the first entry) sees "true" when checked and "false" --
  // never null -- when unchecked.
  const isOpen = formData.get("is_open") !== "false";
  const rawTags = String(formData.get("tags") ?? "");
  const tags = rawTags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  if (name.length < 2 || name.length > 60) return { error: "Name must be 2-60 characters." };
  if (purpose.length < 10 || purpose.length > 280) return { error: "Purpose must be 10-280 characters." };
  if (tags.length > 5) return { error: "Up to 5 tags." };

  const slug = String(formData.get("slug") ?? "").trim().toLowerCase() || slugify(name);
  const slugErr = slugError(slug);
  if (slugErr) return { error: slugErr };

  const { error } = await supabase
    .from("clubs")
    .insert({ slug, name, purpose, tags, is_open: isOpen, created_by: user.id });
  if (error) return { error: friendlyDbError(error) };

  revalidatePath("/community");
  return { ok: true, slug };
}

export async function joinClub(clubId: string): Promise<ClubActionState & { status?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { data, error } = await supabase.rpc("club_join", { p_club: clubId });
  if (error) return { error: friendlyDbError(error) };

  const path = await clubDetailPath(supabase, clubId);
  if (path) revalidatePath(path);
  revalidatePath("/community");
  return { ok: true, status: data ?? undefined };
}

export async function leaveClub(clubId: string): Promise<ClubActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { error } = await supabase.rpc("club_leave", { p_club: clubId });
  if (error) return { error: friendlyDbError(error) };

  const path = await clubDetailPath(supabase, clubId);
  if (path) revalidatePath(path);
  revalidatePath("/community");
  return { ok: true };
}

export async function approveMember(clubId: string, userId: string): Promise<ClubActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { error } = await supabase.rpc("club_approve", { p_club: clubId, p_user: userId });
  if (error) return { error: friendlyDbError(error) };

  const path = await clubDetailPath(supabase, clubId);
  if (path) revalidatePath(path);
  return { ok: true };
}

export async function rejectMember(clubId: string, userId: string): Promise<ClubActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { error } = await supabase.rpc("club_reject", { p_club: clubId, p_user: userId });
  if (error) return { error: friendlyDbError(error) };

  const path = await clubDetailPath(supabase, clubId);
  if (path) revalidatePath(path);
  return { ok: true };
}

export async function setMemberRole(
  clubId: string,
  userId: string,
  role: string,
  title: string | null,
): Promise<ClubActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { error } = await supabase.rpc("club_set_role", {
    p_club: clubId,
    p_user: userId,
    p_role: role,
    // Generated Args type says p_title: string, but the SQL param is a plain
    // nullable text column (title CHECK allows null) -- generator quirk, not
    // a real constraint. Cast, not a hand-written row shape.
    p_title: title as string,
  });
  if (error) return { error: friendlyDbError(error) };

  const path = await clubDetailPath(supabase, clubId);
  if (path) revalidatePath(path);
  return { ok: true };
}

export async function postAnnouncement(clubId: string, body: string): Promise<ClubActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const trimmed = body.trim();
  if (trimmed.length < 1 || trimmed.length > 1000) {
    return { error: "Announcement must be 1-1000 characters." };
  }

  const { error } = await supabase
    .from("club_announcements")
    .insert({ club_id: clubId, author_id: user.id, body: trimmed });
  if (error) return { error: friendlyDbError(error) };

  const path = await clubDetailPath(supabase, clubId);
  if (path) revalidatePath(path);
  return { ok: true };
}

export async function deleteAnnouncement(announcementId: string, clubId: string): Promise<ClubActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { error } = await supabase.from("club_announcements").delete().eq("id", announcementId);
  if (error) return { error: friendlyDbError(error) };

  const path = await clubDetailPath(supabase, clubId);
  if (path) revalidatePath(path);
  return { ok: true };
}

export async function deleteClub(clubId: string): Promise<ClubActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { error } = await supabase.from("clubs").delete().eq("id", clubId);
  if (error) return { error: friendlyDbError(error) };

  revalidatePath("/community");
  return { ok: true };
}

export type ClubUpdate = { name?: string; purpose?: string; tags?: string[]; is_open?: boolean };

export async function updateClub(clubId: string, patch: ClubUpdate): Promise<ClubActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  if (patch.name !== undefined && (patch.name.length < 2 || patch.name.length > 60)) {
    return { error: "Name must be 2-60 characters." };
  }
  if (patch.purpose !== undefined && (patch.purpose.length < 10 || patch.purpose.length > 280)) {
    return { error: "Purpose must be 10-280 characters." };
  }
  if (patch.tags !== undefined && patch.tags.length > 5) {
    return { error: "Up to 5 tags." };
  }

  const { error } = await supabase.from("clubs").update(patch).eq("id", clubId);
  if (error) return { error: friendlyDbError(error) };

  const path = await clubDetailPath(supabase, clubId);
  if (path) revalidatePath(path);
  return { ok: true };
}
