"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { createPost, composerNudge, improvePost, type ComposerState } from "@/app/(app)/feed/actions";
import { createClient } from "@/lib/supabase/client";
import { useSubmitShortcut } from "@/lib/useSubmitShortcut";
import { submitShortcutLabel } from "@/lib/keyboard";
import { TEXT_LIMITS } from "@/lib/utils/validation";
import MentionTextarea from "@/components/ui/MentionTextarea";

// 150 chars earns a heatmap point, it does NOT gate posting.
const POINT_AT = 150; // ponytail: mirrors log_contribution post threshold
const AWARD = 5; // ponytail: mirrors log_contribution post points
const MAX = TEXT_LIMITS.post;

const MAX_FILES = 4;
const MAX_IMAGE = 8 * 1024 * 1024;
const MAX_VIDEO = 100 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm"];

type Picked = { file: File; type: "image" | "video"; url: string };

const MAX_DIM = 1600;
const WEBP_QUALITY = 0.82;

// Shrinks an oversized photo before upload so we're not shipping full-res JPEGs
// over the wire on every view. Static raster images only — never call this on
// GIFs (flattens animation to one frame) or video (not an image at all); the
// call site below gates on `type === "image" && file.type !== "image/gif"`.
// ponytail: best-effort client-side resize; the bucket's MIME/size limit is the
// real backstop, this just saves bytes on the common case.
async function downscaleImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
  if (scale === 1) {
    bitmap.close();
    return file; // already small enough
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", WEBP_QUALITY));
  if (!blob) return file; // encode failed, fall back to the original file
  return new File([blob], file.name.replace(/\.\w+$/, "") + ".webp", { type: "image/webp" });
}

export default function PostComposer({ isPro = false }: { isPro?: boolean }) {
  const [state, formAction, pending] = useActionState<ComposerState, FormData>(createPost, {});
  const ref = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [len, setLen] = useState(0);
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<Picked[]>([]);
  const [mediaErr, setMediaErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [supabase] = useState(createClient);
  const [hint, setHint] = useState<string | null>(null);
  const [overCap, setOverCap] = useState(false);
  const [shortcutLabel, setShortcutLabel] = useState("");
  const [nudging, startNudge] = useTransition();
  const [improving, startImprove] = useTransition();
  const [preImprove, setPreImprove] = useState<string | null>(null);
  const [, startSubmit] = useTransition();

  // Latest files for the unmount-only revoke below (avoids a [files]-dep effect
  // that would revoke still-shown previews on every add).
  const filesRef = useRef(files);
  filesRef.current = files;

  // Reset the form and counter after a successful post.
  useEffect(() => {
    if (state.ok) {
      ref.current?.reset();
      setContent("");
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
      const res = await composerNudge();
      if ("overCap" in res) {
        setOverCap(true);
        setHint(null);
      } else {
        setHint(res.text);
        setOverCap(false);
      }
    });
  }

  function useHint() {
    if (!hint) return;
    setContent(hint);
    textareaRef.current?.focus();
    setLen(hint.trim().length);
    setHint(null);
  }

  function applyText(next: string) {
    setContent(next);
    setLen(next.trim().length);
  }

  // Pro-only: rewrite the current draft, keeping the original for one-tap undo.
  function onImprove() {
    if (!content.trim() || improving) return;
    startImprove(async () => {
      const res = await improvePost(content);
      if ("text" in res) {
        setPreImprove(content);
        applyText(res.text);
      }
      // locked (non-Pro) can't reach here — the button links to /pro instead.
      // error → leave the draft untouched.
    });
  }

  function undoImprove() {
    if (preImprove === null) return;
    applyText(preImprove);
    setPreImprove(null);
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
        // GIFs and video pass through untouched — canvas would flatten a GIF to
        // one frame, and video isn't an image at all. Only static images resize.
        const upload = type === "image" && file.type !== "image/gif" ? await downscaleImage(file) : file;
        const ext = upload.name.includes(".") ? upload.name.split(".").pop() : upload.type.split("/")[1];
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("post-media").upload(path, upload);
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
    <form
      ref={ref}
      onSubmit={onSubmit}
      className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-4 transition-colors focus-within:border-[var(--border-strong)] sm:p-5"
    >
      {hint && (
        <button
          type="button"
          onClick={useHint}
          className="mb-2 block w-full text-left text-xs italic text-[var(--ink-muted)] hover:underline"
        >
          {hint} <span className="not-italic">(click to use)</span>
        </button>
      )}
      {overCap && (
        <p className="mb-2 text-xs text-[var(--ink-muted)]">
          Out of AI prompts for today.{" "}
          <Link href="/pro" className="font-medium text-[var(--ink)] underline">
            Upgrade for unlimited + smarter AI
          </Link>
          .
        </p>
      )}
      <MentionTextarea
        textareaRef={textareaRef}
        name="content"
        rows={4}
        required
        maxLength={MAX}
        value={content}
        onChange={(v) => {
          setContent(v);
          setLen(v.trim().length);
        }}
        placeholder={
          shortcutLabel
            ? `Share what you're building… Type @ to mention (${shortcutLabel} to post)`
            : "Share what you're building… Type @ to mention"
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
                className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-xs text-white transition active:scale-90"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {(state.error || mediaErr) && (
        <p role="alert" className="mt-2 text-sm text-[var(--danger)]">
          {mediaErr ?? state.error}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-3">
        <div className="flex items-center gap-3">
          <span
            className={`text-xs transition-colors duration-300 motion-reduce:transition-none ${
              len >= MAX ? "text-[var(--danger)]" : qualifies ? "text-[var(--blue)]" : "text-[var(--ink-muted)]"
            }`}
          >
            {len === 0
              ? `${POINT_AT}+ characters earns +${AWARD} points`
              : len >= MAX
                ? `${len}/${MAX}`
                : qualifies
                  ? `+${AWARD} points earned`
                  : `${POINT_AT - len} more characters to earn +${AWARD} points`}
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
          {isPro ? (
            preImprove !== null ? (
              <button
                type="button"
                onClick={undoImprove}
                className="text-xs text-[var(--ink-muted)] underline"
              >
                Undo improve
              </button>
            ) : (
              <button
                type="button"
                onClick={onImprove}
                disabled={improving || len === 0}
                className="text-xs font-medium text-[var(--blue)] underline disabled:opacity-50"
              >
                {improving ? "Improving…" : "✦ Improve"}
              </button>
            )
          ) : (
            <Link
              href="/pro"
              title="Improve is a Pro feature. Upgrade to rewrite your drafts."
              className="text-xs font-medium text-[var(--ink-muted)] underline"
            >
              ✦ Improve <span className="text-[var(--ink-faint)]">(Pro)</span>
            </Link>
          )}
        </div>
        <button
          type="submit"
          disabled={pending || uploading || len === 0 || len > MAX}
          className="btn-primary"
        >
          {uploading ? "Uploading…" : pending ? "Posting…" : "Post"}
        </button>
      </div>
    </form>
  );
}
