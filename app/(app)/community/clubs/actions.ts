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

// deleteChannel is only handed a channelId -- look up its club before the
// delete RPC runs (the row, and the join to it, is gone after) so we can
// still revalidate the right club page.
async function clubIdForChannel(
  supabase: Awaited<ReturnType<typeof createClient>>,
  channelId: string,
): Promise<string | null> {
  const { data } = await supabase.from("club_channels").select("club_id").eq("id", channelId).maybeSingle();
  return data?.club_id ?? null;
}

// Same shape as friendlyDbError above, but for the channel/rename RPCs whose
// RAISE messages and unique_violation meaning are different from the
// club-level ones (a duplicate channel name isn't a taken URL).
function mapRpcError(
  error: { code?: string; message?: string } | null,
  known: string[],
  duplicateMessage: string,
): string {
  if (!error) return "Something went wrong.";
  if (error.code === "23505") return duplicateMessage;
  const message = error.message ?? "";
  const hit = known.find((k) => message.includes(k));
  return hit ? hit.charAt(0).toUpperCase() + hit.slice(1) : "Something went wrong.";
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

// name is NOT settable here -- slug is frozen against plain updates, so a
// name change must go through renameClub instead (it regenerates the slug).
export type ClubUpdate = { purpose?: string; tags?: string[]; is_open?: boolean };

export async function updateClub(clubId: string, patch: ClubUpdate): Promise<ClubActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  if (patch.purpose !== undefined && (patch.purpose.length < 10 || patch.purpose.length > 280)) {
    return { error: "Purpose must be 10-280 characters." };
  }
  if (patch.tags !== undefined && patch.tags.length > 5) {
    return { error: "Up to 5 tags." };
  }

  // Explicit allow-list: never spread caller-supplied keys into the update.
  // name/slug/is_verified are frozen by the DB guard, but name isn't (rename
  // owns it), so an extra `name` key here could drift name from slug.
  const safe = { purpose: patch.purpose, tags: patch.tags, is_open: patch.is_open };
  const { error } = await supabase.from("clubs").update(safe).eq("id", clubId);
  if (error) return { error: friendlyDbError(error) };

  const path = await clubDetailPath(supabase, clubId);
  if (path) revalidatePath(path);
  return { ok: true };
}

// A name change regenerates the slug (slug is frozen against updateClub), so
// the caller must redirect to the returned slug after this succeeds.
export async function renameClub(clubId: string, newName: string): Promise<ClubActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const trimmed = newName.trim();
  if (trimmed.length < 2 || trimmed.length > 60) {
    return { error: "Name must be 2-60 characters." };
  }

  const { data, error } = await supabase.rpc("club_rename", { p_club: clubId, p_name: trimmed });
  if (error) {
    return {
      error: mapRpcError(
        error,
        ["not authorized", "name must be 2-60 characters", "no such club", "not authenticated", "account suspended"],
        "That name is taken.",
      ),
    };
  }

  const newSlug = data ?? undefined;
  if (newSlug) revalidatePath(`/community/clubs/${newSlug}`);
  return { ok: true, slug: newSlug };
}

export type ClubChannelActionState = ClubActionState & { channelId?: string };

export async function createChannel(
  clubId: string,
  name: string,
  minRole: string,
): Promise<ClubChannelActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 40) {
    return { error: "Channel name must be 1-40 characters." };
  }
  if (!["everyone", "officers", "owner"].includes(minRole)) {
    return { error: "Invalid channel role." };
  }

  const { data, error } = await supabase.rpc("club_create_channel", {
    p_club: clubId,
    p_name: trimmed,
    p_min_role: minRole,
  });
  if (error) {
    return {
      // Generic on 23505: a name-collision message would confirm the existence
      // of an owner-only channel that can_read_channel otherwise hides from an
      // officer creating channels.
      error: mapRpcError(
        error,
        ["not authorized", "invalid channel role", "no such club", "not authenticated", "account suspended"],
        "Could not create channel. Try a different name.",
      ),
    };
  }

  const path = await clubDetailPath(supabase, clubId);
  if (path) revalidatePath(path);
  return { ok: true, channelId: data ?? undefined };
}

export async function deleteChannel(channelId: string): Promise<ClubActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  // Looked up before the delete RPC runs -- the row (and this join) is gone
  // once it succeeds.
  const clubId = await clubIdForChannel(supabase, channelId);

  const { error } = await supabase.rpc("club_delete_channel", { p_channel: channelId });
  if (error) {
    return {
      error: mapRpcError(
        error,
        [
          "the general channel cannot be deleted",
          "not authorized",
          "no such channel",
          "not authenticated",
          "account suspended",
        ],
        "A channel with that name already exists.",
      ),
    };
  }

  if (clubId) {
    const path = await clubDetailPath(supabase, clubId);
    if (path) revalidatePath(path);
  }
  return { ok: true };
}

// The bucket upload happens client-side (keyed by '<clubId>/...', mirroring
// profile/edit's avatar upload) -- this only persists the resulting URL.
export async function updateClubAvatar(clubId: string, avatarUrl: string): Promise<ClubActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { error } = await supabase.from("clubs").update({ avatar_url: avatarUrl }).eq("id", clubId);
  if (error) return { error: friendlyDbError(error) };

  const path = await clubDetailPath(supabase, clubId);
  if (path) revalidatePath(path);
  return { ok: true };
}
