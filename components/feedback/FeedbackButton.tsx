"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/ui/Modal";
import { TEXT_LIMITS } from "@/lib/utils/validation";

type Category = "bug" | "idea" | "other";
const CATEGORIES: { value: Category; label: string }[] = [
  { value: "bug", label: "Bug" },
  { value: "idea", label: "Idea" },
  { value: "other", label: "Other" },
];

export function FeedbackModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [category, setCategory] = useState<Category>("bug");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handleClose() {
    onClose();
    setCategory("bug");
    setMessage("");
    setError(null);
    setDone(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) {
      setError("Say something first.");
      return;
    }
    setPending(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setPending(false);
      setError("Couldn't submit. Try again.");
      return;
    }
    const { error: err } = await supabase.from("feedback").insert({
      user_id: user.id,
      message: message.trim().slice(0, TEXT_LIMITS.feedback),
      category,
    });
    setPending(false);
    if (err) {
      setError("Couldn't submit. Try again.");
      return;
    }
    setDone(true);
  }

  return (
    <Modal open={open} onClose={handleClose} title="Send feedback">
      {done ? (
        <p className="text-sm text-[var(--ink-muted)]">Thanks, got it.</p>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <fieldset className="flex flex-wrap gap-1.5">
            <legend className="sr-only">Category</legend>
            {CATEGORIES.map((c) => {
              const active = category === c.value;
              return (
                <label
                  key={c.value}
                  className={`cursor-pointer rounded-full border px-3 py-1 text-sm transition ${
                    active
                      ? "border-[var(--border-strong)] bg-[var(--featured-surface)] text-[var(--ink)]"
                      : "border-[var(--border)] text-[var(--ink-muted)] hover:border-[var(--border-strong)] hover:text-[var(--ink)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="category"
                    value={c.value}
                    checked={active}
                    onChange={() => setCategory(c.value)}
                    className="sr-only"
                  />
                  {c.label}
                </label>
              );
            })}
          </fieldset>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What's on your mind?"
            rows={4}
            maxLength={TEXT_LIMITS.feedback}
            className="input-base resize-none"
          />
          {error && <p role="alert" className="text-sm text-[#c0392b] dark:text-[#e88]">{error}</p>}
          <button type="submit" disabled={pending} className="btn-primary w-full">
            {pending ? "Submitting…" : "Send feedback"}
          </button>
        </form>
      )}
    </Modal>
  );
}

// Standalone trigger + modal (kept for reuse outside the nav menu).
export default function FeedbackButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className ?? "cursor-pointer text-[var(--ink-muted)] hover:text-[var(--ink)]"}
      >
        Feedback
      </button>
      <FeedbackModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
