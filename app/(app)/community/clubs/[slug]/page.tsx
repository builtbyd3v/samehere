import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EmptyState from "@/components/ui/EmptyState";
import MemberRow, { type ClubMemberProfile } from "@/components/clubs/MemberRow";
import JoinLeaveButton, { ClubOwnerActions } from "@/components/clubs/JoinLeaveButton";
import ClubChat from "@/components/clubs/ClubChat";
import ClubAvatar from "@/components/clubs/ClubAvatar";
import ClubVerifiedBadge from "@/components/clubs/ClubVerifiedBadge";
import ClubHeaderEditor from "./ClubHeaderEditor";
import { postAnnouncement, deleteAnnouncement } from "../actions";

type ClubMemberRow = {
  user_id: string;
  role: string;
  title: string | null;
  profile: ClubMemberProfile | null;
};

const MEMBER_SELECT =
  "user_id, role, title, profile:profiles!club_members_user_id_fkey(username, display_name, avatar_url, is_pro, is_founder, is_campus_founder, verified_student)";

type AnnouncementRow = {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  author: ClubMemberProfile | null;
};

const ANNOUNCEMENT_SELECT =
  "id, body, created_at, author_id, author:profiles!club_announcements_author_id_fkey(username, display_name, avatar_url, is_pro, is_founder, is_campus_founder, verified_student)";

// Club detail: header (join/leave + owner edit/delete), member roster,
// pending requests (owner|officer only), announcements, and a chat placeholder
// (another agent's ClubChat.tsx). RLS is the real gate everywhere -- the role
// checks below only decide what renders, mirroring how FollowRequests/PostMenu
// treat their own definer-fn-backed actions.
export default async function ClubPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null; // proxy already gates this route

  const { data: club } = await supabase
    .from("clubs")
    .select("id, slug, name, purpose, tags, is_open, created_by, avatar_url, is_verified")
    .eq("slug", slug)
    .maybeSingle();
  if (!club) notFound();

  const { data: membership } = await supabase
    .from("club_members")
    .select("role, title, status")
    .eq("club_id", club.id)
    .eq("user_id", user.id)
    .maybeSingle();

  const isAcceptedMember = membership?.status === "accepted";
  const viewerRole = isAcceptedMember ? membership.role : null;
  const isOwner = viewerRole === "owner";
  const canManage = isOwner || viewerRole === "officer";
  const initialStatus = membership?.status === "accepted" || membership?.status === "pending" ? membership.status : null;

  const { data: acceptedRaw } = await supabase
    .from("club_members")
    .select(MEMBER_SELECT)
    .eq("club_id", club.id)
    .eq("status", "accepted")
    .order("joined_at", { ascending: true })
    .returns<ClubMemberRow[]>();
  const accepted = acceptedRaw ?? [];

  let pending: ClubMemberRow[] = [];
  if (canManage) {
    const { data } = await supabase
      .from("club_members")
      .select(MEMBER_SELECT)
      .eq("club_id", club.id)
      .eq("status", "pending")
      .order("joined_at", { ascending: true })
      .returns<ClubMemberRow[]>();
    pending = data ?? [];
  }

  let announcements: AnnouncementRow[] = [];
  if (isAcceptedMember) {
    const { data } = await supabase
      .from("club_announcements")
      .select(ANNOUNCEMENT_SELECT)
      .eq("club_id", club.id)
      .order("created_at", { ascending: false })
      .returns<AnnouncementRow[]>();
    announcements = data ?? [];
  }

  // Inline Server Action: the composer is a plain <form> (progressive
  // enhancement, no client state needed) so it needs a (formData) => void
  // wrapper around postAnnouncement's (clubId, body) signature.
  const clubId = club.id;
  async function submitAnnouncement(formData: FormData) {
    "use server";
    const body = String(formData.get("body") ?? "");
    await postAnnouncement(clubId, body);
  }

  return (
    <main className="page-enter mx-auto max-w-2xl px-4 py-6 sm:px-5 sm:py-8">
      <div className="card p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 gap-3">
            <ClubAvatar url={club.avatar_url} name={club.name} className="h-14 w-14 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-xl font-semibold tracking-[-0.02em] sm:text-2xl">{club.name}</h1>
                {club.is_verified && <ClubVerifiedBadge />}
              </div>
              <p className="mt-1 text-sm text-[var(--ink-muted)]">{club.purpose}</p>
              {club.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {club.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-[var(--border)] px-2.5 py-0.5 text-xs text-[var(--ink-muted)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-2 text-sm text-[var(--ink-muted)]">
                {accepted.length} {accepted.length === 1 ? "member" : "members"}
              </p>
              {isOwner && <ClubHeaderEditor clubId={club.id} name={club.name} />}
            </div>
          </div>
          <JoinLeaveButton clubId={club.id} isOpen={club.is_open} initialStatus={initialStatus} />
        </div>

        {isOwner && (
          <ClubOwnerActions
            club={{ id: club.id, name: club.name, purpose: club.purpose, tags: club.tags, is_open: club.is_open }}
          />
        )}
      </div>

      <section className="card mt-5 p-4 sm:p-5">
        <h2 className="mb-3 text-sm font-semibold text-[var(--ink)]">Members</h2>
        {accepted.length === 0 ? (
          <EmptyState title="No members yet" />
        ) : (
          <div className="flex flex-col gap-2">
            {accepted.map((m) => (
              <MemberRow
                key={m.user_id}
                clubId={club.id}
                userId={m.user_id}
                role={m.role}
                title={m.title}
                profile={m.profile}
                canManage={canManage}
                isOwnerViewer={isOwner}
              />
            ))}
          </div>
        )}
      </section>

      {canManage && (
        <section className="card mt-5 p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-semibold text-[var(--ink)]">Pending requests</h2>
          {pending.length === 0 ? (
            <p className="text-sm text-[var(--ink-muted)]">No pending requests.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {pending.map((m) => (
                <MemberRow
                  key={m.user_id}
                  clubId={club.id}
                  userId={m.user_id}
                  role={m.role}
                  title={m.title}
                  profile={m.profile}
                  pending
                  canManage={canManage}
                  isOwnerViewer={isOwner}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <section className="card mt-5 p-4 sm:p-5">
        <h2 className="mb-3 text-sm font-semibold text-[var(--ink)]">Announcements</h2>

        {canManage && (
          <form action={submitAnnouncement} className="mb-4 flex flex-col gap-2">
            <textarea
              name="body"
              required
              maxLength={1000}
              rows={3}
              placeholder="Post an announcement…"
              className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="btn-inset self-start rounded-md bg-[var(--ink)] px-3 py-1.5 text-sm font-medium text-[var(--canvas)]"
            >
              Post
            </button>
          </form>
        )}

        {!isAcceptedMember ? (
          <EmptyState title="Join to see announcements" description="Announcements are for members only." />
        ) : announcements.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)]">No announcements yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {announcements.map((a) => {
              const name = a.author?.display_name ?? a.author?.username ?? "Unknown";
              const canDelete = isOwner || a.author_id === user.id;
              return (
                <div key={a.id} className="rounded-lg border border-[var(--border)] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-[var(--ink-muted)]">
                      <span className="font-medium text-[var(--ink)]">{name}</span>
                      <span>· {new Date(a.created_at).toLocaleDateString()}</span>
                    </div>
                    {canDelete && (
                      <form
                        action={async () => {
                          "use server";
                          await deleteAnnouncement(a.id, clubId);
                        }}
                      >
                        <button type="submit" className="text-xs text-[var(--danger)] hover:underline">
                          Delete
                        </button>
                      </form>
                    )}
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm text-[var(--ink)]">{a.body}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="card mt-5 p-4 sm:p-5">
        <h2 className="mb-3 text-sm font-semibold text-[var(--ink)]">Chat</h2>
        {isAcceptedMember && membership ? (
          <ClubChat clubId={club.id} viewerId={user.id} viewerRole={membership.role} />
        ) : (
          <EmptyState title="Join to see the chat" description="Club chat is for members only." />
        )}
      </section>
    </main>
  );
}
