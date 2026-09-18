"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { LazyMotion, domMax, m } from "motion/react";
import { createPost, type ComposerState } from "@/app/(app)/feed/actions";
import { getBrowserClient } from "@/lib/supabase/client";
import { useSubmitShortcut } from "@/lib/useSubmitShortcut";
import { submitShortcutLabel } from "@/lib/keyboard";
import { TEXT_LIMITS } from "@/lib/utils/validation";
import MentionTextarea from "@/components/ui/MentionTextarea";
import LabelGlyph from "@/components/ui/LabelGlyph";
import { usePrefersReducedMotion } from "@/lib/landing/usePrefersReducedMotion";
import {
  COMPOSER_LABELS,
  CONTEXT_LABEL_COLOR,
  CONTEXT_LABEL_COPY,
  type ContextLabel,
} from "@/lib/context-label";

// 150 chars earns a heatmap point, it does NOT gate posting.
const POINT_AT = 150; // ponytail: mirrors posts_award_contribution post threshold
const AWARD = 4; // ponytail: mirrors posts_award_contribution post points (6 if >=600 chars)
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

function ComposerLabelPicker({
  value,
  onChange,
}: {
  value: ContextLabel | null;
  onChange: (next: ContextLabel | null) => void;
}) {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <LazyMotion features={domMax} strict>
      <div
        className="relative inline-flex gap-0.5 rounded-full border border-[var(--border)] p-0.5"
        role="group"
        aria-label="Post label"
      >
        {COMPOSER_LABELS.map((key) => {
          const selected = value === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(selected ? null : key)}
              aria-pressed={selected}
              className="relative z-10 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium tracking-[0.01em] text-[var(--ink-muted)] transition-colors duration-[var(--dur-micro)] hover:text-[var(--ink)]"
            >
              {selected ? (
                <m.span
                  layoutId="composer-label-thumb"
                  className="absolute inset-0 rounded-full bg-[var(--blue-glow)]"
                  transition={reduceMotion ? { duration: 0 } : { duration: 0.22, ease: [0.65, 0, 0.35, 1] }}
                  aria-hidden
                />
              ) : null}
              <span className="relative inline-flex items-center gap-1">
                <span style={{ color: selected ? CONTEXT_LABEL_COLOR[key] : "var(--ink-faint)" }}>
                  <LabelGlyph label={key} />
                </span>
                <span>{CONTEXT_LABEL_COPY[key]}</span>
              </span>
            </button>
          );
        })}
      </div>
    </LazyMotion>
  );
}

export default function PostComposer({
  autoFocus = false,
}: {
  isPro?: boolean;
  autoFocus?: boolean;
}) {
  const [state, formAction, pending] = useActionState<ComposerState, FormData>(createPost, {});
  const ref = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [len, setLen] = useState(0);
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<Picked[]>([]);
  const [mediaErr, setMediaErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [supabase] = useState(getBrowserClient);
  const [shortcutLabel, setShortcutLabel] = useState("");
  const [label, setLabel] = useState<ContextLabel | null>(null);
  const [, startSubmit] = useTransition();

  // Latest files for the unmount-only revoke below (avoids a [files]-dep effect
  // that would revoke still-shown previews on every add).
  const filesRef = useRef(files);
  useEffect(() => {
    filesRef.current = files;
  });

  // Reset the form and counter after a successful post. Depend on the `state`
  // object identity, not `state.ok`: two posts in a row both return { ok: true },
  // so the boolean never changes on the 2nd — but useActionState stores a fresh
  // object each time, so the object reference does. Keying on that re-runs the
  // reset for every successful post instead of only the first.
  useEffect(() => {
    if (state.ok) {
      ref.current?.reset();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reacts to useActionState completion (no synchronous onSuccess in React 19's action model); paired with the form.reset()/revokeObjectURL side effects here.
      setContent("");
      setLen(0);
      setLabel(null);
      files.forEach((f) => URL.revokeObjectURL(f.url));
      setFiles([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Revoke object URLs on unmount only.
  useEffect(() => () => filesRef.current.forEach((f) => URL.revokeObjectURL(f.url)), []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- navigator-based label deferred to post-hydration to avoid an SSR/client mismatch
    setShortcutLabel(submitShortcutLabel());
  }, []);

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus();
  }, [autoFocus]);

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

      const results = await Promise.all(
        files.map(async ({ file, type }) => {
          // GIFs and video pass through untouched — canvas would flatten a GIF to
          // one frame, and video isn't an image at all. Only static images resize.
          const upload = type === "image" && file.type !== "image/gif" ? await downscaleImage(file) : file;
          const ext = upload.name.includes(".") ? upload.name.split(".").pop() : upload.type.split("/")[1];
          const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
          const { error } = await supabase.storage.from("post-media").upload(path, upload);
          return { path, type, error };
        }),
      );

      const failed = results.find((r) => r.error);
      if (failed) {
        setUploading(false);
        return setMediaErr("Media upload failed. Try again.");
      }

      setUploading(false);
      formData.set("media", JSON.stringify(results.map(({ path, type }) => ({ path, type }))));
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
      className="card-raised p-4 transition-[border-color,box-shadow] duration-300 focus-within:border-[var(--border-strong)] focus-within:shadow-[0_0_0_4px_var(--blue-glow)] sm:p-5"
    >
      <input type="hidden" name="context_label" value={label ?? ""} />
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
                // eslint-disable-next-line @next/next/no-img-element -- blob: preview from FileReader; next/image cannot optimize local object URLs
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
          <ComposerLabelPicker value={label} onChange={setLabel} />
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
