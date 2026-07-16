// Persistent notice for a suspended user. Suspension is enforced only as an
// RLS check on content INSERT (posts/comments/reactions/reposts/messages/club
// content). Reads are unaffected. Static markup, no interactivity needed.
export default function SuspendedBanner() {
  return (
    <div
      role="alert"
      className="border-b border-[var(--danger)]/40 bg-[var(--danger)]/[0.06] px-4 py-2.5 text-center text-sm text-[var(--ink)] sm:px-6"
    >
      Your account is suspended. You can still browse samehere, but you cannot post, comment, react, repost, or send messages.
    </div>
  );
}
