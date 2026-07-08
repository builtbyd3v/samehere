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
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--ink)] transition hover:bg-[var(--featured-surface)] hover:border-[var(--border-strong)] disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={pending}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition active:opacity-80 disabled:opacity-50 ${
            destructive
              ? "bg-[var(--danger)] text-white hover:brightness-110"
              : "btn-inset bg-[var(--ink)] text-[var(--canvas)] hover:brightness-110"
          }`}
        >
          {pending ? "…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
