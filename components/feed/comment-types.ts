// Shared shape for a post's comment, used by the server-fetched list
// (app/(app)/post/[id]/page.tsx) and the client optimistic wrapper
// (CommentThread.tsx + CommentComposer.tsx). Plain types module (no
// "use client"/"use server") so both sides can import it without a
// circular dependency between the two components.
export type CommentAuthor = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_pro: boolean;
  is_founder: boolean;
  is_campus_founder: boolean;
  verified_student: boolean;
};

export type Comment = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  author: CommentAuthor | null;
  // Optimistic row only — real rows never carry this. Suppresses the
  // delete button and dims the row until the server action resolves.
  pending?: boolean;
};
