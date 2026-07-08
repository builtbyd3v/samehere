"use client";

import { useEffect, useRef } from "react";

// Generic modal shell: native <dialog> gives us Esc-to-close and focus
// handling for free. Backdrop click closes (click lands on <dialog> itself,
// not the inner content div). No dependency.
// ponytail: hand-rolled overlay, no modal lib
export default function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="fixed inset-0 m-auto w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface-card)] p-0 text-[var(--ink)] shadow-paper backdrop:backdrop-blur-sm open:animate-[modal-in_180ms_ease] motion-reduce:open:animate-none [&::backdrop]:bg-black/40"
    >
      <div className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-6 w-6 place-items-center rounded-full text-[var(--ink-muted)] transition hover:bg-[var(--featured-surface)] hover:text-[var(--ink)]"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
