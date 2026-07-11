"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import { createClub, type ClubActionState } from "@/app/(app)/community/clubs/actions";

const PURPOSE_MAX = 280; // ponytail: hardcoded cap, no separate TEXT_LIMITS entry for clubs yet
const MAX_TAGS = 5;
const CODE_RE = /^[a-z0-9-]{3,40}$/;

// Mirrors actions.ts's server-side slugify -- lowercase, spaces to hyphens,
// strip anything else, cap at 40 -- so the code field can never contain a
// character the DB CHECK would reject.
function slugifyInput(v: string): string {
  return v
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 40);
}

// Self-contained trigger + modal: renders the "Create a club" button itself so
// ClubsTab (a server component) doesn't need its own client state just to open
// this dialog.
export default function CreateClubModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ClubActionState, FormData>(createClub, {});
  const [purposeLen, setPurposeLen] = useState(0);
  const [code, setCode] = useState("");
  const [codeEdited, setCodeEdited] = useState(false);

  useEffect(() => {
    if (state.ok && state.slug) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reacts to useActionState completion (no synchronous onSuccess in React 19's action model); paired with the router.push side effect below.
      setOpen(false);
      router.push(`/community/clubs/${state.slug}`);
    }
  }, [state.ok, state.slug, router]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-primary">
        Create a club
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Create a club">
        <form action={formAction} className="flex flex-col gap-3">
          <div>
            <label htmlFor="club-name" className="mb-1 block text-xs font-medium text-[var(--ink-muted)]">
              Name
            </label>
            <input
              id="club-name"
              name="name"
              required
              maxLength={80}
              className="input-base"
              placeholder="e.g. CS Study Group"
              onChange={(e) => {
                if (!codeEdited) setCode(slugifyInput(e.target.value));
              }}
            />
          </div>
          <div>
            <label htmlFor="club-code" className="mb-1 block text-xs font-medium text-[var(--ink-muted)]">
              Club code
            </label>
            <input
              id="club-code"
              name="slug"
              required
              minLength={3}
              maxLength={40}
              pattern="[a-z0-9-]{3,40}"
              value={code}
              onChange={(e) => {
                setCodeEdited(true);
                setCode(slugifyInput(e.target.value));
              }}
              className="input-base font-mono"
              placeholder="cs-study-group"
            />
            <p className="mt-1 text-xs text-[var(--ink-muted)]">
              This is your club&apos;s link: /community/clubs/{code || "your-code"} — lowercase letters, numbers,
              hyphens. Can&apos;t be changed later.
            </p>
            {code.length > 0 && !CODE_RE.test(code) && (
              <p role="alert" className="mt-1 text-xs text-[var(--danger)]">
                Code must be 3-40 characters: lowercase letters, numbers, or hyphens.
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="club-purpose"
              className="mb-1 flex items-center justify-between text-xs font-medium text-[var(--ink-muted)]"
            >
              <span>Purpose</span>
              <span>{PURPOSE_MAX - purposeLen}</span>
            </label>
            <textarea
              id="club-purpose"
              name="purpose"
              required
              rows={3}
              maxLength={PURPOSE_MAX}
              onChange={(e) => setPurposeLen(e.target.value.length)}
              className="input-base resize-y"
              placeholder="What's this club about?"
            />
          </div>
          <div>
            <label htmlFor="club-tags" className="mb-1 block text-xs font-medium text-[var(--ink-muted)]">
              Tags (up to {MAX_TAGS}, comma-separated)
            </label>
            {/* ponytail: comma input, chip UI later */}
            <input
              id="club-tags"
              name="tags"
              maxLength={200}
              className="input-base"
              placeholder="hiking, robotics, first-gen"
            />
          </div>
          <label className="flex items-center gap-2.5 text-sm text-[var(--ink)]">
            {/* createClub reads is_open via `formData.get("is_open") !== "false"` --
                an unchecked box sends nothing at all, not "false", so the hidden
                fallback (same name, after the checkbox in DOM order) is what
                actually carries the "false" value; FormData.get() returns the
                first same-named entry, and the checkbox's own entry always comes
                first when it's present. */}
            <input type="checkbox" name="is_open" value="true" defaultChecked className="h-4 w-4 accent-[var(--ink)]" />
            <input type="hidden" name="is_open" value="false" />
            <span>
              Open <span className="text-[var(--ink-muted)]">, anyone can join without approval</span>
            </span>
          </label>
          {/* ponytail: no club id exists until after creation, so the avatar
              picker lives on the club page's own "change photo" affordance
              instead of here -- avoids a two-step upload dance in this modal. */}
          <p className="text-xs text-[var(--ink-muted)]">You can add a club photo after creating it.</p>
          {state.error && (
            <p role="alert" className="text-sm text-[var(--danger)]">
              {state.error}
            </p>
          )}
          <div className="mt-1 flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={pending} className="btn-primary">
              {pending ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
