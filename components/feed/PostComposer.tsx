"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { createPost, composerNudge, type ComposerState } from "@/app/(app)/feed/actions";
import { createClient } from "@/lib/supabase/client";
import { useSubmitShortcut } from "@/lib/useSubmitShortcut";
import { submitShortcutLabel } from "@/lib/keyboard";

// 150 chars earns a heatmap point — it does NOT gate posting.
const POINT_AT = 150;

const MAX_FILES = 4;
const MAX_IMAGE = 8 * 1024 * 1024;
const MAX_VIDEO = 100 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm"];

type Picked = { file: File; type: "image" | "video"; url: string };

export default function PostComposer() {
  const [state, formAction, pending] = useActionState<ComposerState, FormData>(createPost, {});
  const ref = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [len, setLen] = useState(0);
  const [files, setFiles] = useState<Picked[]>([]);
  const [mediaErr, setMediaErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [supabase] = useState(createClient);
  const [hint, setHint] = useState<string | null>(null);
  const [shortcutLabel, setShortcutLabel] = useState("");
  const [nudging, startNudge] = useTransition();
  const [, startSubmit] = useTransition();

  // Latest files for the unmount-only revoke below (avoids a [files]-dep effect
  // that would revoke still-shown previews on every add).
  const filesRef = useRef(files);
  filesRef.current = files;

  // Reset the form and counter after a successful post.
  useEffect(() => {
    if (state.ok) {
      ref.current?.reset();
      setLen(0);
      files.forEach((f) => URL.revokeObjectURL(f.url));
      setFiles([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  // Revoke object URLs on unmount only.
  useEffect(() => () => filesRef.current.forEach((f) => URL.revokeObjectURL(f.url)), []);

  useEffect(() => setShortcutLabel(submitShortcutLabel()), []);

  const qualifies = len >= POINT_AT;

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = ""; // allow re-picking the same file after an error
    if (picked.length === 0) return;

    if (files.length + picked.length > MAX_FILES) {
      return setMediaErr(`Up to ${MAX_FILES} files per post.`);
    }
    for (const file of picked) {
      if (!ALLOWED.includes(file.type)) {
        return setMediaErr("Only jpg, png, webp, gif, mp4, or webm files.");
      }
      const isImage = file.type.startsWith("image/");
      if (isImage && file.size > MAX_IMAGE) return setMediaErr("Images must be under 8 MB.");
      if (!isImage && file.size > MAX_VIDEO) return setMediaErr("Videos must be under 100 MB.");
    }

    setMediaErr(null);
    setFiles((prev) => [
      ...prev,
      ...picked.map((file) => ({
        file,
        type: (file.type.startsWith("image/") ? "image" : "video") as "image" | "video",
        url: URL.createObjectURL(file),
      })),
    ]);
  }

  function onNudge() {
    startNudge(async () => {
      const prompt = await composerNudge();
      setHint(prompt);
    });
  }

  function useHint() {
    if (!hint) return;
    if (textareaRef.current) {
      textareaRef.current.value = hint;
      textareaRef.current.focus();
    }
    setLen(hint.trim().length);
    setHint(null);
  }

  function removeFile(i: number) {
    setFiles((prev) => {
      URL.revokeObjectURL(prev[i].url);
      return prev.filter((_, idx) => idx !== i);
    });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    if (files.length > 0) {
      setUploading(true);
      setMediaErr(null);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setUploading(false);
        return setMediaErr("You must be logged in.");
      }

      const media: { path: string; type: "image" | "video" }[] = [];
      for (const { file, type } of files) {
        const ext = file.name.includes(".") ? file.name.split(".").pop() : file.type.split("/")[1];
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("post-media").upload(path, file);
        if (upErr) {
          setUploading(false);
          return setMediaErr("Media upload failed. Try again.");
        }
        media.push({ path, type });
      }
      setUploading(false);
      formData.set("media", JSON.stringify(media));
    }

    startSubmit(() => {
      formAction(formData);
    });
  }

  useSubmitShortcut(textareaRef, () => ref.current?.requestSubmit(), !pending && !uploading && len > 0);

  return (
    <form ref={ref} onSubmit={onSubmit} className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-4 sm:p-5">
      {hint && (
        <button
          type="button"
          onClick={useHint}
          className="mb-2 block w-full text-left text-xs italic text-[var(--ink-muted)] hover:underline"
        >
          {hint} <span className="not-italic">(click to use)</span>
        </button>
      )}
      <textarea
        ref={textareaRef}
        name="content"
        rows={4}
        required
        onChange={(e) => setLen(e.target.value.trim().length)}
        placeholder={
          shortcutLabel
            ? `Share what you're building, learning, or figuring out… (${shortcutLabel} to post)`
            : "Share what you're building, learning, or figuring out…"
        }
        className="w-full resize-y bg-transparent text-[16px] leading-[1.55] text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)]"
      />

      {files.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {files.map((f, i) => (
            <div key={f.url} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-[var(--border)]">
              {f.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.url} alt="" className="h-full w-full object-cover" />
              ) : (
                <video src={f.url} className="h-full w-full object-cover" />
              )}
              <button
                type="button"
                onClick={() => removeFile(i)}
                aria-label="Remove"
                className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-xs text-white"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {(state.error || mediaErr) && (
        <p role="alert" className="mt-2 text-sm text-[#c0392b] dark:text-[#e88]">
          {mediaErr ?? state.error}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-3">
        <div className="flex items-center gap-3">
          <span className={`text-xs ${qualifies ? "text-[var(--blue)]" : "text-[var(--ink-muted)]"}`}>
            {len === 0
              ? `${POINT_AT}+ characters earns a point`
              : qualifies
                ? `${len} characters · earns a point`
                : `${POINT_AT - len} more to earn a point`}
          </span>
          <label className="cursor-pointer text-xs font-medium text-[var(--ink-muted)] underline">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
              multiple
              onChange={onPickFiles}
              className="hidden"
            />
            Add media
          </label>
          <button
            type="button"
            onClick={onNudge}
            disabled={nudging}
            className="text-xs text-[var(--ink-muted)] underline disabled:opacity-50"
          >
            {nudging ? "Thinking…" : "Need an idea?"}
          </button>
        </div>
        <button
          type="submit"
          disabled={pending || uploading || len === 0}
          className="btn-inset rounded-md bg-[var(--ink)] px-4 py-1.5 text-sm font-medium text-[var(--canvas)] transition active:opacity-80 disabled:opacity-50"
        >
          {uploading ? "Uploading…" : pending ? "Posting…" : "Post"}
        </button>
      </div>
    </form>
  );
}
