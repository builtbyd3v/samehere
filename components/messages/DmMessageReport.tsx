"use client";

import { useState } from "react";
import Menu from "@/components/ui/Menu";
import Modal from "@/components/ui/Modal";
import { ReportForm } from "@/components/feed/ReportForm";
import { menuItemClass } from "@/lib/ui/menu-styles";

// Per-message report affordance on an incoming DM bubble. The message target is
// the concrete evidence a harassed student needs to file; the peer is always a
// conversation member, so this message is always readable by the reporter.
export default function DmMessageReport({
  messageId,
  viewerId,
}: {
  messageId: string;
  viewerId: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Menu trigger={<span aria-hidden>⋯</span>} align="start">
        <button type="button" onClick={() => setOpen(true)} className={menuItemClass}>
          Report message
        </button>
      </Menu>

      <Modal open={open} onClose={() => setOpen(false)} title="Report message">
        <ReportForm target={{ kind: "message", messageId }} viewerId={viewerId} />
      </Modal>
    </>
  );
}
