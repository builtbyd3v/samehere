"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Menu from "@/components/ui/Menu";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Modal from "@/components/ui/Modal";
import { ReportForm } from "./ReportForm";
import { deletePost } from "@/app/(app)/feed/actions";

import { menuDangerClass, menuItemClass } from "@/lib/ui/menu-styles";

// Post ⋯ menu — replaces the old standalone ReportButton + DeletePostButton
// action-row pair. Own post: copy link, delete. Other's post: copy link,
// report, block author.
export default function PostMenu({
  postId,
  authorId,
  authorUsername,
  viewerId,
}: {
  postId: string;
  authorId: string;
  authorUsername: string;
  viewerId: string | null;
}) {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const isOwn = !!viewerId && viewerId === authorId;

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/post/${postId}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  async function handleDelete() {
    await deletePost(postId);
    router.refresh();
  }

  async function handleBlock() {
    await supabase.rpc("block_user", { target: authorId });
    router.refresh();
  }

  return (
    <>
      <Menu trigger={<span aria-hidden>⋯</span>} align="end">
        <button type="button" onClick={copyLink} className={menuItemClass}>
          {copied ? "Copied" : "Copy link"}
        </button>
        {isOwn ? (
          <button type="button" onClick={() => setConfirmDelete(true)} className={menuDangerClass}>
            Delete
          </button>
        ) : (
          viewerId && (
            <>
              <button type="button" onClick={() => setReportOpen(true)} className={menuItemClass}>
                Report
              </button>
              <button type="button" onClick={() => setConfirmBlock(true)} className={menuDangerClass}>
                Block @{authorUsername}
              </button>
            </>
          )
        )}
      </Menu>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete post"
        message="Delete this post? This cannot be undone."
        confirmLabel="Delete"
        destructive
      />
      <ConfirmDialog
        open={confirmBlock}
        onClose={() => setConfirmBlock(false)}
        onConfirm={handleBlock}
        title="Block user"
        message={`Block @${authorUsername}? This removes any follows between you and hides their posts.`}
        confirmLabel="Block"
        destructive
      />

      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title="Report post">
        {viewerId && <ReportForm postId={postId} viewerId={viewerId} />}
      </Modal>
    </>
  );
}
