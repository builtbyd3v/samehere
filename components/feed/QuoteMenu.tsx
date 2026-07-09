"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Menu from "@/components/ui/Menu";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Modal from "@/components/ui/Modal";
import { ReportForm } from "./ReportForm";
import { deleteQuoteRepost } from "@/app/(app)/quote/[id]/actions";
import { menuDangerClass, menuItemClass } from "@/lib/ui/menu-styles";

export default function QuoteMenu({
  quoteId,
  quoteText,
  reposterId,
  reposterUsername,
  originalPostId,
  viewerId,
}: {
  quoteId: string;
  quoteText: string;
  reposterId: string;
  reposterUsername: string;
  originalPostId: string;
  viewerId: string | null;
}) {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const isOwn = !!viewerId && viewerId === reposterId;

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/quote/${quoteId}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  async function handleDelete() {
    await deleteQuoteRepost(quoteId);
    router.push("/feed");
    router.refresh();
  }

  async function handleBlock() {
    await supabase.rpc("block_user", { target: reposterId });
    router.refresh();
  }

  if (!viewerId) return null;

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
          <>
            <button type="button" onClick={() => setReportOpen(true)} className={menuItemClass}>
              Report
            </button>
            <button type="button" onClick={() => setConfirmBlock(true)} className={menuDangerClass}>
              Block @{reposterUsername}
            </button>
          </>
        )}
      </Menu>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete quote"
        message="Remove this quote repost? This cannot be undone."
        confirmLabel="Delete"
        destructive
      />
      <ConfirmDialog
        open={confirmBlock}
        onClose={() => setConfirmBlock(false)}
        onConfirm={handleBlock}
        title="Block user"
        message={`Block @${reposterUsername}? This removes any follows between you and hides their posts.`}
        confirmLabel="Block"
        destructive
      />

      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title="Report quote">
        <ReportForm
          target={{ kind: "post", postId: originalPostId }}
          viewerId={viewerId}
          context={`Quote repost ${quoteId}: ${quoteText.trim().slice(0, 280)}`}
        />
      </Modal>
    </>
  );
}
