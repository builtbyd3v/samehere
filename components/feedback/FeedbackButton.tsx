"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/ui/Modal";

type Category = "bug" | "idea" | "other";
const CATEGORIES: { value: Category; label: string }[] = [
  { value: "bug", label: "Bug" },
  { value: "idea", label: "Idea" },
  { value: "other", label: "Other" },
];

// Trigger only rendered for logged-in users (Navbar gates on username).
// No viewer-id prop plumbed through Navbar — fetched on open instead.
export default function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>("bug");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function close() {
    setOpen(false);
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
    const { error: err } = await supabase
      .from("feedback")
      .insert({ user_id: user.id, message: message.trim(), category });
    setPending(false);
    if (err) {
      setError("Couldn't submit. Try again.");
      return;
    }
    setDone(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[var(--ink-muted)] hover:text-[var(--ink)]"
      >
        Feedback
      </button>
      <Modal open={open} onClose={close} title="Send feedback">
        {done ? (
          <p className="text-sm text-[var(--ink-muted)]">Thanks — got it.</p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <fieldset className="space-y-1.5">
              <legend className="sr-only">Category</legend>
              {CATEGORIES.map((c) => (
                <label key={c.value} className="flex items-center gap-2 text-sm text-[var(--ink)]">
                  <input
                    type="radio"
                    name="category"
                    value={c.value}
                    checked={category === c.value}
                    onChange={() => setCategory(c.value)}
                  />
                  {c.label}
                </label>
              ))}
            </fieldset>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What's on your mind?"
              rows={4}
              maxLength={1000}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)]"
            />
            {error && <p role="alert" className="text-sm text-[#c0392b] dark:text-[#e88]">{error}</p>}
            <button
              type="submit"
              disabled={pending}
              className="btn-inset w-full rounded-md bg-[var(--ink)] px-4 py-1.5 text-sm font-medium text-[var(--canvas)] transition active:opacity-80 disabled:opacity-50"
            >
              {pending ? "Submitting…" : "Send feedback"}
            </button>
          </form>
        )}
      </Modal>
    </>
  );
}
