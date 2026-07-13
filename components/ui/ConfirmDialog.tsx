"use client";

import { useState } from "react";
import Modal from "./Modal";

// Built on Modal. Confirm runs onConfirm (async ok) with a pending state, then
// closes — callers just perform the action, no extra open/close plumbing.
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  destructive,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
}) {
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    setPending(true);
    await onConfirm();
    setPending(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-[var(--ink-muted)]">{message}</p>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onClose} disabled={pending} className="btn-ghost">
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={pending}
          className={destructive ? "btn-danger" : "btn-primary"}
        >
          {pending ? "…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
