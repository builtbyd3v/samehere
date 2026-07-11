"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import AvatarImage from "@/components/ui/AvatarImage";
import LocalTime from "@/components/ui/LocalTime";
import { IconBolt } from "@/components/icons";

export type ProfileViewer = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_pro: boolean;
  created_at: string;
};

// Small inline lock glyph — matches the project's inline-SVG icon convention.
function IconLock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function ViewerAvatar({ url, name, ring = false, isPro = false }: { url: string | null; name: string; ring?: boolean; isPro?: boolean }) {
  const cls = `h-9 w-9 shrink-0 rounded-full border border-[var(--border)] object-cover${ring ? " ring-2 ring-[var(--surface-card)]" : ""}`;
  if (url) return <AvatarImage src={url} alt="" className={cls} pro={isPro} />;
  return (
    <div className={`grid place-items-center bg-[var(--featured-surface)] text-xs font-semibold text-[var(--ink-muted)] ${cls}`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function ViewerRow({ v }: { v: ProfileViewer }) {
  const name = v.display_name ?? v.username;
  return (
    <Link
      href={`/profile/${v.username}`}
      className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-[var(--featured-surface)]"
    >
      <ViewerAvatar url={v.avatar_url} name={name} isPro={v.is_pro} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--ink)]">{name}</p>
        <p className="truncate text-xs text-[var(--ink-muted)]">@{v.username}</p>
      </div>
      <LocalTime iso={v.created_at} variant="notification" className="shrink-0 text-xs text-[var(--ink-faint)]" />
    </Link>
  );
}

function ViewersModal({ viewers, count, onClose }: { viewers: ProfileViewer[]; count: number; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  // Portal to <body> so `fixed` is viewport-relative (the profile page's
  // page-enter transform would otherwise trap it in a containing block).
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Who viewed your profile">
      <button type="button" aria-label="Close" onClick={onClose} className="backdrop-fade absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative z-10 flex max-h-[82dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--surface-card)] shadow-paper animate-[sheet-in_var(--duration-modal)_var(--ease-drawer)] motion-reduce:animate-none sm:animate-[modal-in_200ms_var(--ease-out)] sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <h2 className="text-base font-semibold text-[var(--ink)]">
            Who viewed your profile <span className="font-normal text-[var(--ink-muted)]">· {count}</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 grid h-8 w-8 place-items-center rounded-full text-[var(--ink-muted)] transition hover:bg-[var(--featured-surface)] hover:text-[var(--ink)]"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>
        <ul className="flex-1 overflow-y-auto p-3">
          {viewers.map((v) => (
            <li key={v.id}>
              <ViewerRow v={v} />
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}

export default function ProfileViewers({
  isPro,
  count,
  recent,
}: {
  isPro: boolean;
  count: number;
  /** Real viewer rows — only passed in (non-empty) when isPro; empty for the locked view. */
  recent: ProfileViewer[];
}) {
  const [open, setOpen] = useState(false);

  if (count === 0) {
    return (
      <section className="card mt-3 p-5 sm:p-6">
        <h2 className="mb-1 text-sm font-semibold text-[var(--ink)]">Recent profile views</h2>
        <p className="text-sm text-[var(--ink-muted)]">No views yet.</p>
      </section>
    );
  }

  if (!isPro) {
    return (
      <section className="card mt-3 p-5 sm:p-6">
        <h2 className="mb-4 text-sm font-semibold text-[var(--ink)]">Recent profile views</h2>
        <p className="mb-3 text-sm text-[var(--ink-muted)]">
          <b className="text-[var(--ink)]">{count}</b> recent {count === 1 ? "view" : "views"}
        </p>
        {/* ponytail: placeholder rows only — no real viewer data is fetched/sent for non-Pro. */}
        <ul className="flex flex-col gap-1">
          {Array.from({ length: Math.min(count, 5) }).map((_, i) => (
            <li key={i} className="flex items-center gap-3 px-2 py-1.5">
              <div className="h-9 w-9 shrink-0 rounded-full border border-[var(--border)] bg-[var(--featured-surface)] blur-sm" />
              <div className="min-w-0 flex-1 select-none blur-sm">
                <p className="truncate text-sm font-medium text-[var(--ink)]">Hidden viewer</p>
                <p className="truncate text-xs text-[var(--ink-muted)]">@hidden</p>
              </div>
              <IconLock />
            </li>
          ))}
        </ul>
        <Link
          href="/pro"
          className="btn-inset mt-4 flex w-full items-center justify-center gap-1.5 rounded-md bg-[var(--ink)] px-4 py-2.5 text-sm font-medium text-[var(--canvas)] transition active:scale-[0.98] active:opacity-80"
        >
          <IconBolt className="h-4 w-4" />
          See who viewed you · Pro
        </Link>
      </section>
    );
  }

  // Pro: a tactile button that opens the full list in a modal.
  const preview = recent.slice(0, 4);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="card card-hover mt-3 flex w-full items-center gap-4 p-5 text-left shadow-paper sm:p-6"
      >
        {preview.length > 0 && (
          <div className="flex shrink-0 -space-x-2.5">
            {preview.map((v) => (
              <ViewerAvatar key={v.id} url={v.avatar_url} name={v.display_name ?? v.username} ring isPro={v.is_pro} />
            ))}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--ink)]">Who viewed your profile</p>
          <p className="text-sm text-[var(--ink-muted)]">
            {count} recent {count === 1 ? "view" : "views"}
          </p>
        </div>
        <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0 text-[var(--ink-faint)]" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M7.5 4.5 13 10l-5.5 5.5" />
        </svg>
      </button>

      {open && <ViewersModal viewers={recent} count={count} onClose={() => setOpen(false)} />}
    </>
  );
}
