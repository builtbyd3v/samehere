"use client";

import { useState } from "react";
import Menu from "@/components/ui/Menu";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { leaveConversation } from "@/app/(app)/messages/actions";
import { menuDangerClass } from "@/lib/ui/menu-styles";

// Thread-level control: leave the conversation. Reporting a specific message
// lives on each incoming bubble (DmMessageReport); reporting the person lives on
// their profile, one tap away via the header avatar link.
export default function DmThreadMenu({ conversationId }: { conversationId: string }) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <Menu trigger={<span aria-hidden>⋯</span>} align="end">
        <button type="button" onClick={() => setConfirmOpen(true)} className={menuDangerClass}>
          Leave conversation
        </button>
      </Menu>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => leaveConversation(conversationId)}
        title="Leave conversation"
        message="Leave this conversation? It disappears from your inbox. Messaging them again reopens it."
        confirmLabel="Leave"
        destructive
      />
    </>
  );
}
